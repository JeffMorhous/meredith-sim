(() => {
  const paths = {
    map: '<path d="m2 5 6-3 7 3 7-3v16l-7 3-7-3-6 3zM8 2v16m7-13v16"/>',
    chair: '<path d="M6 13V4l2-2h8l2 2v9M4 12h16v5H4zM6 17v5m12-5v5"/>',
    gamepad: '<path d="M4 6h16l2 10-2 2-4-4H8l-4 4-2-2z"/><path d="M6 10h5m-2.5-2.5v5m6.5-2.5h.2m2.8 2h.2"/>',
    book: '<path d="M3 4h6l3 2 3-2h6v15h-6l-3 2-3-2H3zM12 6v15"/>',
    bag: '<path d="M4 8h16v13H4zM8 8V5l2-2h4l2 2v3"/>',
    music: '<path d="M9 17V6l11-3v12M9 9l11-3"/><ellipse cx="6" cy="18" rx="3" ry="2.5" fill="currentColor"/><ellipse cx="17" cy="16" rx="3" ry="2.5" fill="currentColor"/>',
    pin: '<path d="M7 2h9v2h3v9h-2v3h-2v3h-2v3h-2v-3H9v-3H7v-3H5V4h2z" fill="currentColor" stroke="none"/><path d="M9 6h6v5H9z" fill="#344c38" stroke="none"/>',
    star:'<path d="M10 1h4v4h2v3h7v4h-3v3h-3v6h-4v-2h-3v2H6v-6H3v-3H1V8h7V5h2z" fill="#85632d" stroke="none"/><path d="M11 3h2v4h2v3h6v1h-3v3h-3v5h-1v-2h-4v2H8v-6H5v-2H3v-1h7V7h1z" fill="#ffcf68" stroke="none"/><path d="M11 8h2v3h-2z" fill="#fff3b8" stroke="none"/>',
    heart:'<path fill="currentColor" stroke="none" d="M2 4h6v2h2v2h3V6h2V4h6v2h2v7h-2v2h-2v2h-3v2h-2v2h-3v-2H8v-2H6v-2H4v-2H2v-2H0V6h2z"/>',
    sun:'<path d="M10 1h4v3h-4zM10 20h4v3h-4zM1 10h3v4H1zM20 10h3v4h-3zM3 3h3v3H3zM18 3h3v3h-3zM3 18h3v3H3zM18 18h3v3h-3zM8 6h8v2h2v8h-2v2H8v-2H6V8h2z" fill="currentColor" stroke="none"/>',
    arrows:'<path d="M12 2v20M2 12h20M8 6l4-4 4 4M18 8l4 4-4 4M6 8l-4 4 4 4M8 18l4 4 4-4"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9 9c0-4 8-4 7 .5-.5 2-4 2-4 5m0 2v1"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    check:'<path d="m4 12 5 5L20 6"/>'
  };
  function icon(name){return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||'')+'</svg>'}
  function fill(root=document){root.querySelectorAll('[data-icon]').forEach(node=>{node.innerHTML=icon(node.dataset.icon)})}
  window.PocketIcons={fill,icon};
  fill();
})();
