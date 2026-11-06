// La preferencia "Como el sistema": el servidor no puede saber si el sistema está en oscuro,
// así que esto lo resuelve antes de pintar. Con "Claro" u "Oscuro" no hace nada.
// Es un archivo y no un <script> en línea para no usar dangerouslySetInnerHTML.
;(function () {
  var root = document.documentElement
  var media = window.matchMedia('(prefers-color-scheme: dark)')
  function resolve() {
    if (root.getAttribute('data-theme-pref') !== 'system') return
    var mode = media.matches ? 'dark' : 'light'
    // Solo si cambia: escribir el mismo valor volvería a disparar el observador de abajo.
    if (root.getAttribute('data-mode') !== mode) root.setAttribute('data-mode', mode)
  }
  resolve()
  media.addEventListener('change', resolve)
  // Guardar la cookie hace que Next vuelva a renderizar el layout, y con "system" el servidor
  // siempre manda data-mode="light". Esto lo corrige antes de que se pinte.
  new MutationObserver(resolve).observe(root, { attributes: true, attributeFilter: ['data-mode'] })
})()
