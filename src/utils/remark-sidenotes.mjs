import { visit } from 'unist-util-visit';

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("'", '&#39;');
}

function serializeNodes(nodes = []) {
  return nodes.map(serializeNode).join('');
}

function serializeNode(node) {
  switch (node.type) {
    case 'text':
      return escapeHtml(node.value);
    case 'paragraph':
      return serializeNodes(node.children ?? []);
    case 'emphasis':
      return `<em>${serializeNodes(node.children ?? [])}</em>`;
    case 'strong':
      return `<strong>${serializeNodes(node.children ?? [])}</strong>`;
    case 'delete':
      return `<del>${serializeNodes(node.children ?? [])}</del>`;
    case 'inlineCode':
      return `<code>${escapeHtml(node.value)}</code>`;
    case 'break':
      return '<br>';
    case 'link': {
      let href = typeof node.url === 'string' ? node.url : '#';
      return `<a href="${escapeAttribute(href)}">${serializeNodes(node.children ?? [])}</a>`;
    }
    case 'list': {
      let items = (node.children ?? []).map((child) => serializeNode(child)).filter(Boolean);
      return items.join('; ');
    }
    case 'listItem':
      return serializeNodes(node.children ?? []);
    case 'code':
      return `<code>${escapeHtml(node.value)}</code>`;
    case 'html':
      return node.value;
    default:
      return serializeNodes(node.children ?? []);
  }
}

export function remarkSidenotes() {
  return (tree) => {
    let footnotes = new Map();
    let sidenoteCount = 0;

    tree.children = tree.children.filter((node) => {
      if (node.type !== 'footnoteDefinition') {
        return true;
      }

      footnotes.set(node.identifier, serializeNodes(node.children ?? []));
      return false;
    });

    visit(tree, 'footnoteReference', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;

      let identifier = node.identifier;
      let content = footnotes.get(identifier);
      if (!content) return;

      sidenoteCount += 1;
      let toggleId = `sn-${identifier}-${sidenoteCount}`;
      let number = String(sidenoteCount);

      parent.children[index] = {
        type: 'html',
        value:
          `<span class="sidenote-wrapper" data-number="${escapeAttribute(number)}">` +
          `<label for="${escapeAttribute(toggleId)}" class="sidenote-toggle sidenote-number" data-number="${escapeAttribute(number)}" tabindex="0" aria-label="Toggle sidenote ${escapeAttribute(number)}">${escapeHtml(number)}</label>` +
          `<input id="${escapeAttribute(toggleId)}" type="checkbox" class="sidenote-toggle-checkbox">` +
          `<span class="sidenote" data-number="${escapeAttribute(number)}"><span class="sidenote-number" data-number="${escapeAttribute(number)}">${escapeHtml(number)}</span> ${content}</span>` +
          `</span>`,
      };
    });
  };
}
