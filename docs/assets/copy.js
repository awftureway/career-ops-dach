// Kopier-Button für Codeblöcke. Ohne Abhängigkeiten.
// Kopiert den Text aus <pre><code>, ohne Zeilen, die mit "#" beginnen
// (Kommentarzeilen in Shell-Beispielen), es sei denn, der Block ist YAML.
(function () {
  'use strict';

  function textFor(block) {
    var code = block.querySelector('pre code') || block.querySelector('pre');
    var text = code ? code.textContent : '';
    if (block.getAttribute('data-lang') === 'shell') {
      text = text
        .split('\n')
        .map(function (line) { return line.replace(/\s+#\s.*$/, ''); })
        .filter(function (line) { return !/^\s*#/.test(line); })
        .join('\n');
    }
    return text.replace(/\s+$/, '');
  }

  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'absolute';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(area);
    return ok;
  }

  function flash(button, label) {
    button.textContent = label;
    button.classList.add('copied');
    window.setTimeout(function () {
      button.textContent = 'Kopieren';
      button.classList.remove('copied');
    }, 2000);
  }

  document.querySelectorAll('.code').forEach(function (block) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-btn';
    button.textContent = 'Kopieren';
    button.setAttribute('aria-label', 'Code in die Zwischenablage kopieren');
    var status = document.createElement('span');
    status.className = 'visually-hidden';
    status.setAttribute('role', 'status');
    status.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);';

    button.addEventListener('click', function () {
      var text = textFor(block);
      var done = function () { flash(button, 'Kopiert'); status.textContent = 'In die Zwischenablage kopiert.'; };
      var fail = function () { flash(button, 'Fehler'); status.textContent = 'Kopieren nicht möglich.'; };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, function () {
          if (fallbackCopy(text)) { done(); } else { fail(); }
        });
      } else if (fallbackCopy(text)) {
        done();
      } else {
        fail();
      }
    });

    block.classList.add('has-copy');
    block.appendChild(button);
    block.appendChild(status);
  });
}());
