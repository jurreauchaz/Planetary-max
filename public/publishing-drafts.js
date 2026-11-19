(() => {
  const STORAGE_PREFIX = 'max-publishing-draft-v1:';
  const isDraftable = (form) => form.matches('.publishing-panel form, #publishing form');

  function formKey(form) {
    const panel = form.closest('.publishing-panel, #publishing');
    const forms = panel ? Array.from(panel.querySelectorAll('form')) : [];
    return `${STORAGE_PREFIX}${forms.indexOf(form)}`;
  }

  function controlsFor(form) {
    return Array.from(form.elements).filter((control) => {
      if (!control.name || control.disabled) return false;
      if (control instanceof HTMLButtonElement) return false;
      if (control instanceof HTMLInputElement && ['button', 'submit', 'reset', 'image', 'file', 'password'].includes(control.type)) return false;
      return control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement;
    });
  }

  function restore(form) {
    if (!isDraftable(form) || form.dataset.draftRestoreChecked) return;
    form.dataset.draftRestoreChecked = 'true';
    try {
      const draft = JSON.parse(sessionStorage.getItem(formKey(form)) || 'null');
      if (!Array.isArray(draft)) return;
      const controls = controlsFor(form);
      const byName = new Map();
      for (const control of controls) {
        const group = byName.get(control.name) || [];
        group.push(control);
        byName.set(control.name, group);
      }
      for (const [name, saved] of Object.entries(Object.groupBy ? Object.groupBy(draft, (entry) => entry.name) : draft.reduce((groups, entry) => {
        (groups[entry.name] ||= []).push(entry);
        return groups;
      }, {}))) {
        const group = byName.get(name) || [];
        saved.forEach((entry, index) => {
          const control = group[index];
          if (!control) return;
          if (control instanceof HTMLInputElement && ['checkbox', 'radio'].includes(control.type)) control.checked = Boolean(entry.checked);
          else if (control instanceof HTMLSelectElement && control.multiple) {
            const selected = new Set(Array.isArray(entry.value) ? entry.value : []);
            Array.from(control.options).forEach((option) => { option.selected = selected.has(option.value); });
          } else control.value = entry.value ?? '';
        });
      }
    } catch { /* Ignore unavailable storage or malformed drafts. */ }
  }

  function save(form) {
    if (!isDraftable(form)) return;
    const draft = controlsFor(form).map((control) => ({
      name: control.name,
      value: control instanceof HTMLSelectElement && control.multiple
        ? Array.from(control.selectedOptions, (option) => option.value)
        : control.value,
      ...(control instanceof HTMLInputElement && ['checkbox', 'radio'].includes(control.type) ? { checked: control.checked } : {}),
    }));
    try { sessionStorage.setItem(formKey(form), JSON.stringify(draft)); } catch { /* Keep the form usable if storage is unavailable or full. */ }
  }

  function scan(root) {
    if (root instanceof HTMLFormElement) restore(root);
    if (root.querySelectorAll) root.querySelectorAll('.publishing-panel form, #publishing form').forEach(restore);
  }

  document.addEventListener('input', (event) => {
    const form = event.target instanceof Element ? event.target.closest('form') : null;
    if (form) save(form);
  }, true);
  document.addEventListener('change', (event) => {
    const form = event.target instanceof Element ? event.target.closest('form') : null;
    if (form) save(form);
  }, true);
  document.addEventListener('reset', (event) => {
    if (event.target instanceof HTMLFormElement && isDraftable(event.target)) {
      try { sessionStorage.removeItem(formKey(event.target)); } catch { /* Ignore unavailable storage. */ }
    }
  }, true);

  scan(document);
  new MutationObserver((mutations) => mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
    if (node instanceof Element) scan(node);
  }))).observe(document.documentElement, { childList: true, subtree: true });
})();
