import { visit } from 'unist-util-visit';

function createElement(tagName, properties = {}, children = []) {
  return {
    type: 'element',
    tagName,
    properties,
    children,
  };
}

function createText(value) {
  return {
    type: 'text',
    value,
  };
}

function hasClass(node, className) {
  let classes = node.properties?.className;
  if (Array.isArray(classes)) {
    return classes.includes(className);
  }

  if (typeof classes === 'string') {
    return classes.split(/\s+/).includes(className);
  }

  return false;
}

function isFootnotesSection(node) {
  if (node.tagName !== 'section') return false;

  return (
    node.properties?.dataFootnotes !== undefined ||
    node.properties?.['data-footnotes'] !== undefined ||
    hasClass(node, 'footnotes')
  );
}

function cloneNode(node) {
  if (node.type === 'text') {
    return createText(node.value);
  }

  if (node.type === 'element') {
    return createElement(
      node.tagName,
      { ...(node.properties ?? {}) },
      (node.children ?? []).map(cloneNode),
    );
  }

  return null;
}

function appendText(nodes, value) {
  if (!value) return;

  let lastNode = nodes[nodes.length - 1];
  if (lastNode?.type === 'text') {
    lastNode.value += value;
    return;
  }

  nodes.push(createText(value));
}

function normalizeWhitespace(nodes) {
  let normalized = [];

  for (let node of nodes) {
    if (node.type === 'text') {
      let value = node.value.replace(/\s+/g, ' ');
      if (!value) continue;
      appendText(normalized, value);
      continue;
    }

    if (node.type === 'element') {
      normalized.push(node);
    }
  }

  while (normalized[0]?.type === 'text' && normalized[0].value.startsWith(' ')) {
    normalized[0].value = normalized[0].value.slice(1);
    if (!normalized[0].value) normalized.shift();
  }

  while (normalized.at(-1)?.type === 'text' && normalized.at(-1).value.endsWith(' ')) {
    let last = normalized.at(-1);
    last.value = last.value.slice(0, -1);
    if (!last.value) normalized.pop();
  }

  return normalized;
}

function flattenInline(nodes = []) {
  let output = [];

  for (let node of nodes) {
    if (node.type === 'text') {
      appendText(output, node.value);
      continue;
    }

    if (node.type !== 'element') {
      continue;
    }

    if (node.tagName === 'a' && node.properties?.dataFootnoteBackref !== undefined) {
      continue;
    }

    if (node.tagName === 'p') {
      let flattened = flattenInline(node.children ?? []);
      if (flattened.length > 0 && output.length > 0) appendText(output, ' ');
      output.push(...flattened);
      continue;
    }

    if (node.tagName === 'ul' || node.tagName === 'ol') {
      let items = (node.children ?? []).filter((child) => child.type === 'element' && child.tagName === 'li');
      items.forEach((item, index) => {
        if (index > 0) appendText(output, '; ');
        output.push(...flattenInline(item.children ?? []));
      });
      continue;
    }

    if (node.tagName === 'li') {
      output.push(...flattenInline(node.children ?? []));
      continue;
    }

    if (node.tagName === 'br') {
      output.push(cloneNode(node));
      continue;
    }

    let clonedChildren = flattenInline(node.children ?? []);
    output.push(createElement(node.tagName, { ...(node.properties ?? {}) }, clonedChildren));
  }

  return normalizeWhitespace(output);
}

export default function rehypeSidenotes() {
  return (tree) => {
    let footnotes = new Map();
    let sidenoteCount = 0;

    visit(tree, 'element', (node) => {
      if (!isFootnotesSection(node)) {
        return;
      }

      let orderedList = (node.children ?? []).find(
        (child) => child.type === 'element' && child.tagName === 'ol',
      );

      if (!orderedList) return;

      for (let item of orderedList.children ?? []) {
        if (item.type !== 'element' || item.tagName !== 'li') continue;
        let noteId = item.properties?.id;
        if (typeof noteId !== 'string') continue;

        footnotes.set(noteId, {
          number: noteId.replace(/^fn-/, ''),
          children: flattenInline(item.children ?? []),
        });

        if (noteId.startsWith('user-content-')) {
          footnotes.set(noteId.replace(/^user-content-/, ''), {
            number: noteId.replace(/^user-content-fn-/, '').replace(/^fn-/, ''),
            children: flattenInline(item.children ?? []),
          });
        }
      }
    });

    visit(tree, 'element', (node, index, parent) => {
      if (!parent || typeof index !== 'number' || node.tagName !== 'sup') {
        return;
      }

      let footnoteLink = (node.children ?? []).find(
        (child) => child.type === 'element' && child.tagName === 'a' && typeof child.properties?.href === 'string',
      );

      if (!footnoteLink) return;

      let href = footnoteLink.properties?.href;
      if (typeof href !== 'string' || !href.startsWith('#')) return;

      let noteKey = href.slice(1).replace(/^user-content-/, '');
      let note = footnotes.get(noteKey);
      if (!note) return;

      sidenoteCount += 1;
      let toggleId = `sn-${note.number}-${sidenoteCount}`;

      parent.children[index] = createElement('span', { className: ['sidenote-wrapper'] }, [
        createElement(
          'label',
          {
            for: toggleId,
            className: ['sidenote-toggle', 'sidenote-number'],
            tabIndex: 0,
            'aria-label': `Toggle sidenote ${note.number}`,
          },
          [createText(note.number)],
        ),
        createElement('input', {
          id: toggleId,
          type: 'checkbox',
          className: ['sidenote-toggle-checkbox'],
        }),
        createElement('span', { className: ['sidenote'] }, [
          createElement('span', { className: ['sidenote-number'] }, [createText(note.number)]),
          createText(' '),
          ...note.children.map(cloneNode).filter(Boolean),
        ]),
      ]);
    });

    visit(tree, 'element', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      if (isFootnotesSection(node)) {
        parent.children.splice(index, 1);
      }
    });
  };
}
