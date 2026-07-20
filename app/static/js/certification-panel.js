/**
 * CertificationPanel - templateBeta certificate module
 * Unified single-section certificate layout with responsive preview.
 */

(function (window) {
  'use strict';

  var CERT_DESIGN_W = 980;
  var CERT_DESIGN_H = 680;

  function isCanvasTaintedError(error) {
    if (!error) return false;
    var message = String(error && error.message ? error.message : error);
    var name = String(error && error.name ? error.name : '');
    return /taint|security|cross-origin|cross origin|permission/i.test(message) || /SecurityError/i.test(name);
  }

  function buildPdfExportError(error) {
    if (isCanvasTaintedError(error)) {
      return new Error('Unable to generate PDF because one or more certificate images are cross-origin without CORS. Host the logo/image on the same domain or enable Access-Control-Allow-Origin.');
    }
    return error;
  }

  function cropCanvasEmptyBorders(srcCanvas, paddingPx) {
    var ctx = srcCanvas.getContext('2d');
    var w = srcCanvas.width;
    var h = srcCanvas.height;
    var data;

    try {
      data = ctx.getImageData(0, 0, w, h).data;
    } catch (error) {
      throw buildPdfExportError(error);
    }

    var top = 0;
    var bottom = h - 1;
    var left = 0;
    var right = w - 1;
    var found = false;

    outerTop: for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] !== 0) {
          top = y;
          found = true;
          break outerTop;
        }
      }
    }

    if (!found) {
      return {
        canvas: srcCanvas,
        crop: {
          left: 0,
          top: 0,
          right: w - 1,
          bottom: h - 1,
          cropW: w,
          cropH: h
        }
      };
    }

    outerBottom: for (var y2 = h - 1; y2 >= 0; y2--) {
      for (var x2 = 0; x2 < w; x2++) {
        if (data[(y2 * w + x2) * 4 + 3] !== 0) {
          bottom = y2;
          break outerBottom;
        }
      }
    }

    outerLeft: for (var x3 = 0; x3 < w; x3++) {
      for (var y3 = top; y3 <= bottom; y3++) {
        if (data[(y3 * w + x3) * 4 + 3] !== 0) {
          left = x3;
          break outerLeft;
        }
      }
    }

    outerRight: for (var x4 = w - 1; x4 >= 0; x4--) {
      for (var y4 = top; y4 <= bottom; y4++) {
        if (data[(y4 * w + x4) * 4 + 3] !== 0) {
          right = x4;
          break outerRight;
        }
      }
    }

    var pad = Math.max(0, Number(paddingPx || 0));
    top = Math.max(0, top - pad);
    left = Math.max(0, left - pad);
    bottom = Math.min(h - 1, bottom + pad);
    right = Math.min(w - 1, right + pad);

    var cropW = Math.max(1, right - left + 1);
    var cropH = Math.max(1, bottom - top + 1);
    var cropped = document.createElement('canvas');
    cropped.width = cropW;
    cropped.height = cropH;

    var cctx = cropped.getContext('2d');
    cctx.drawImage(srcCanvas, left, top, cropW, cropH, 0, 0, cropW, cropH);
    return {
      canvas: cropped,
      crop: {
        left: left,
        top: top,
        right: right,
        bottom: bottom,
        cropW: cropW,
        cropH: cropH
      }
    };
  }

  async function waitForCertificateAssets(certNode) {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    var images = Array.from(certNode.querySelectorAll('img'));
    await Promise.all(images.map(function (img) {
      if (img.complete) {
        if (typeof img.decode === 'function') {
          return img.decode().catch(function () { return null; });
        }
        return Promise.resolve();
      }

      return new Promise(function (resolve) {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }));
  }

  async function exportCertificateToFormat(selectorOrElement, filename, format, options) {
    options = options || {};

    var selectorText = typeof selectorOrElement === 'string' ? selectorOrElement : '[element]';
    var cert = typeof selectorOrElement === 'string'
      ? document.querySelector(selectorOrElement)
      : selectorOrElement;

    if (!cert) {
      throw new Error('Certificate element not found: ' + selectorText);
    }

    if (typeof window.html2canvas !== 'function') {
      throw new Error('html2canvas library is unavailable.');
    }

    if (format === 'pdf') {
      var jsPdfApi = window.jspdf && window.jspdf.jsPDF;
      if (typeof jsPdfApi !== 'function') {
        throw new Error('jsPDF library is unavailable.');
      }
    }

    var targetDPI = Math.max(72, Number(options.targetDPI || 300));
    var scaleCap = Math.max(1, Number(options.scaleCap || 3.5));
    var expandCrop = Math.max(0, Number(options.expandCrop || 0));

    await waitForCertificateAssets(cert);

    var rect = cert.getBoundingClientRect();
    var visualW = Math.max(1, Math.round(rect.width));
    var visualH = Math.max(1, Math.round(rect.height));
    var exportUnscaled = options.unscaled !== false;

    var layoutW = Math.max(1, Math.round(cert.offsetWidth || visualW));
    var layoutH = Math.max(1, Math.round(cert.offsetHeight || visualH));
    var renderW = exportUnscaled ? layoutW : visualW;
    var renderH = exportUnscaled ? layoutH : visualH;

    var clone = cert.cloneNode(true);
    clone.classList.add('cert-pdf-clone');
    clone.style.boxShadow = 'none';
    clone.style.margin = '0';
    clone.style.display = 'block';
    clone.style.width = renderW + 'px';
    clone.style.height = renderH + 'px';
    clone.style.transform = 'none';
    clone.style.transformOrigin = 'top left';

    var offscreen = document.createElement('div');
    offscreen.style.position = 'fixed';
    offscreen.style.left = '-99999px';
    offscreen.style.top = '0';
    offscreen.style.width = renderW + 'px';
    offscreen.style.height = renderH + 'px';
    offscreen.style.overflow = 'visible';
    offscreen.style.padding = '0';
    offscreen.style.margin = '0';
    offscreen.appendChild(clone);
    document.body.appendChild(offscreen);

    try {
      await waitForCertificateAssets(clone);

      var dpr = window.devicePixelRatio || 1;
      var dpiScale = (targetDPI / 96) * Math.min(dpr, 1);
      var scale = Math.min(scaleCap, Math.max(1, dpiScale));

      var canvas = await window.html2canvas(clone, {
        width: renderW,
        height: renderH,
        scale: scale,
        useCORS: true,
        backgroundColor: null,
        logging: false
      });

      var croppedResult = cropCanvasEmptyBorders(canvas, expandCrop);
      var croppedCanvas = croppedResult.canvas;
      var crop = croppedResult.crop;

      try {
        croppedCanvas.getContext('2d').getImageData(0, 0, 1, 1);
      } catch (error) {
        throw buildPdfExportError(error);
      }

      var qaMetrics = {
        visual: {
          width: visualW,
          height: visualH
        },
        layout: {
          width: layoutW,
          height: layoutH
        },
        canvas: {
          width: canvas.width,
          height: canvas.height
        },
        cropped: {
          width: croppedCanvas.width,
          height: croppedCanvas.height
        },
        crop: crop,
        scale: scale,
        dpi: targetDPI,
        format: format,
        fileName: filename,
        unscaled: exportUnscaled
      };
      window.__CERT_EXPORT_QA_LAST = qaMetrics;
      console.info('[CertificationPanel Export QA] ' + format.toUpperCase(), qaMetrics);

      if (format === 'pdf') {
        var pdf = new jsPdfApi({
          unit: 'px',
          format: [croppedCanvas.width, croppedCanvas.height],
          compress: true
        });
        var imgData = croppedCanvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, croppedCanvas.width, croppedCanvas.height);
        pdf.save(filename || 'certificate.pdf');
      } else if (format === 'png') {
        var pngDataUrl = croppedCanvas.toDataURL('image/png');
        var link = document.createElement('a');
        link.href = pngDataUrl;
        link.download = filename || 'certificate.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      return qaMetrics;
    } finally {
      if (offscreen.parentNode) {
        offscreen.parentNode.removeChild(offscreen);
      }
    }
  }

  async function downloadCertificateAsPdf(selectorOrElement, filename, options) {
    return exportCertificateToFormat(selectorOrElement, filename, 'pdf', options);
  }

  async function downloadCertificateAsPng(selectorOrElement, filename, options) {
    return exportCertificateToFormat(selectorOrElement, filename, 'png', options);
  }

  window.downloadCertificateAsPdf = downloadCertificateAsPdf;
  window.downloadCertificateAsPng = downloadCertificateAsPng;
  window.downloadCertificateImage = downloadCertificateAsPng; // alias for backward compat

  var CERT_PANEL_INSTANCE_SEQ = 0;

  function CertificationPanel(options) {
    options = options || {};
    this.completed = options.completed === true;
    this.certificateData = options.certificateData || {};
    this.onDownload = typeof options.onDownload === 'function' ? options.onDownload : null;
    this.instanceId = ++CERT_PANEL_INSTANCE_SEQ;
    this.mockData = {
      fullName: 'Chrishawne Bertillo',
      certificateDescription: 'Has successfully completed the Employee Onboarding Program.',
      templateImageUrl: '/static/images/Certificate_completion.png',
      programTitle: 'Employee Onboarding Program',
      completionDate: 'March 26, 2026',
      certificateId: 'OB-2026-08852',
      issuedBy: 'Gabriel V. Libacao Jr.',
      issuedTitle: 'CEO / Founder',
      logoUrl: '/static/images/innersparc.png'
    };
    this.scaleBindings = [];
  }

  CertificationPanel.prototype.applyScale = function (wrapper, inner) {
    if (!wrapper || !inner) return;

    var styles = window.getComputedStyle(wrapper);
    var horizontalPadding = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
    var availableW = Math.max(1, wrapper.clientWidth - horizontalPadding);
    var scale = Math.min(1, availableW / CERT_DESIGN_W);
    var reservedHeight = Math.round(CERT_DESIGN_H * scale);

    inner.style.transform = 'scale(' + scale + ')';
    wrapper.style.height = reservedHeight + 'px';
    wrapper.style.minHeight = reservedHeight + 'px';
    wrapper.style.maxHeight = reservedHeight + 'px';
  };

  CertificationPanel.prototype.initScale = function (panel) {
    var self = this;
    var wrapper = panel.querySelector('.cert-scale-wrap');
    var inner = wrapper && wrapper.querySelector('.cert-scale-inner');

    if (!wrapper || !inner) {
      return;
    }

    inner.style.width = CERT_DESIGN_W + 'px';
    inner.style.height = CERT_DESIGN_H + 'px';
    self.applyScale(wrapper, inner);

    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(function () {
        self.applyScale(wrapper, inner);
      });
      ro.observe(wrapper);
      self.scaleBindings.push({
        panel: panel,
        observer: ro,
        onResize: null
      });
      return;
    }

    var onResize = function () {
      self.applyScale(wrapper, inner);
    };
    window.addEventListener('resize', onResize);
    self.scaleBindings.push({
      panel: panel,
      observer: null,
      onResize: onResize
    });
  };

  CertificationPanel.prototype.getCertData = function () {
    return Object.assign({}, this.mockData, this.certificateData);
  };

  CertificationPanel.prototype.escapeHtml = function (text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  };

  CertificationPanel.prototype.renderEmptyState = function () {
    return '' +
      '<section class="cert-panel cert-panel--empty" aria-label="Certificate of Completion">' +
        '<div class="cert-empty">' +
          '<div class="cert-empty-icon">' +
            '<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
              '<path d="M9 12l2 2 4-4M7 21h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z"></path>' +
            '</svg>' +
          '</div>' +
          '<h3 class="cert-empty-title">Certificate of Completion</h3>' +
          '<p class="cert-empty-message">Complete your onboarding program to unlock your Certificate of Completion.</p>' +
          '<p class="cert-empty-hint">You\'re on track! Finish all remaining steps to earn your certificate.</p>' +
        '</div>' +
      '</section>';
  };

  CertificationPanel.prototype.renderCertificateContent = function () {
    var cert = this.getCertData();
    var templateImageUrl = (cert.templateImageUrl || '/static/images/Certificate_completion.png');
    var description = (cert.certificateDescription || '').trim();
    if (!description) {
      description = 'Has successfully completed the Employee Onboarding Program.';
    }

    return '' +
      '<div class="cert-content cert-canvas-scale">' +
      '<article class="cert-document cert-canvas-frame" id="certificate-' + String(this.instanceId) + '" data-certificate-id="' + this.escapeHtml(cert.certificateId) + '">' +
        '<img src="' + this.escapeHtml(templateImageUrl) + '" alt="Certificate template" class="cert-template-image" aria-hidden="true" />' +
        '<main class="cert-overlay-fields" aria-label="Certificate personalization">' +
          '<p class="cert-recipient-name">' + this.escapeHtml(cert.fullName) + '</p>' +
          '<p class="cert-description-text">' + this.escapeHtml(description) + '</p>' +
        '</main>' +
      '</article>' +
      '</div>';
  };

  CertificationPanel.prototype.renderCompletedState = function () {
    return '' +
      '<section class="cert-panel cert-panel--ready cert-section" aria-label="Certificate of Completion">' +
        '<div class="cert-header-bar">' +
          '<div class="cert-header-left">' +
            '<span class="cert-success-icon" aria-hidden="true">&#10003;</span>' +
            '<span class="cert-header-text">Congratulations! Your certificate is ready</span>' +
          '</div>' +
        '</div>' +
        '<section class="cert-scale-wrap cert-wrapper" id="certWrapper-' + String(this.instanceId) + '" aria-label="Certificate preview">' +
          '<div class="cert-scale-inner cert-inner" id="certificate">' + this.renderCertificateContent() + '</div>' +
        '</section>' +
        '<footer class="tpl1-foot" role="contentinfo">' +
          '<span class="tpl1-note">Congratulations</span>' +
          '<div class="tpl1-controls">' +
            '<button class="tpl1-btn" type="button" id="certPrev" aria-label="Previous">Prev</button>' +
            '<button class="tpl1-btn primary cert-download" type="button" id="certDownload" aria-label="Download certificate">Download</button>' +
          '</div>' +
        '</footer>' +
      '</section>';
  };

  CertificationPanel.prototype.render = function () {
    var self = this;
    var html = this.completed ? this.renderCompletedState() : this.renderEmptyState();

    setTimeout(function () {
      self.wireEvents();
    }, 0);

    return html;
  };

  CertificationPanel.prototype.wireEvents = function () {
    var self = this;
    var panels = document.querySelectorAll('.cert-panel--ready');

    panels.forEach(function (panel) {
      if (panel.getAttribute('data-cert-panel-bound') === '1') return;
      panel.setAttribute('data-cert-panel-bound', '1');

      self.initScale(panel);

      var prevBtn = panel.querySelector('#certPrev');
      var downloadBtn = panel.querySelector('#certDownload');

      if (prevBtn) {
        prevBtn.addEventListener('click', function (event) {
          event.preventDefault();
          if (typeof window.tplBetaPrevStep === 'function') {
            window.tplBetaPrevStep();
          } else if (typeof window.prev === 'function') {
            window.prev();
          } else {
            window.history.back();
          }
        });
      }

      // Download click handling is delegated in templateBeta inline export helper (PNG-only).
    });
  };

  CertificationPanel.prototype.downloadCertificate = function (selectorOrElement, filename, options) {
    if (typeof window.downloadCertificateAsPdf !== 'function') {
      return Promise.reject(new Error('PDF helper is not available.'));
    }

    return window.downloadCertificateAsPdf(selectorOrElement || '.cert-scale-inner', filename || 'certificate.pdf', options || {
      unscaled: true,
      scaleCap: 2,
      expandCrop: 0
    });
  };

  window.CertificationPanel = CertificationPanel;
})(window);
