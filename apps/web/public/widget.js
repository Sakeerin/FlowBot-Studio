// FlowBot Widget - Embeddable Chat Widget
// This is a bundled version for easy embedding
// In production, this would be built and served from CDN

(function () {
  'use strict';

  // Widget initialization code will be here
  // For now, this is a placeholder that will be replaced with the bundled widget

  console.log('FlowBot Widget loader initialized');

  // Auto-initialize widget from script tag attributes
  function initWidget() {
    const script = document.currentScript || document.querySelector('script[data-flowbot-widget]');
    if (!script) return;

    const apiUrl = script.getAttribute('data-api-url');
    if (!apiUrl) {
      console.error('FlowBot Widget: data-api-url is required');
      return;
    }

    // Load widget code dynamically
    // In production, this would load from CDN or bundle inline
    console.log('FlowBot Widget would initialize with API URL:', apiUrl);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
