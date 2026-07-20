(function () {
    'use strict';

    var MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
    var PDF_JS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    var PDF_JS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    var TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

    var DOC_RULES = {
        education: {
            label: 'Proof of Education',
            keywords: ['diploma', 'transcript', 'tor', 'college', 'university', 'bachelor', 'degree'],
            minMatches: 1
        },
        nbi: {
            label: 'NBI Clearance',
            keywords: ['nbi', 'clearance', 'national bureau of investigation'],
            minMatches: 1
        },
        psa: {
            label: 'PSA Birth Certificate',
            keywords: ['psa', 'birth certificate', 'philippine statistics authority', 'certificate of live birth'],
            minMatches: 1
        },
        tin: {
            label: 'TIN Verification',
            keywords: ['tin', 'bir', 'taxpayer identification', 'form 2303', 'certificate of registration'],
            minMatches: 1
        },
        photo2x2: {
            label: '2x2 Picture',
            keywords: [],
            minMatches: 0,
            allowedExtensions: ['jpg', 'jpeg', 'png'],
            allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png']
        },
        prc: {
            label: 'PRC Accreditation / ID',
            keywords: ['prc', 'professional regulation commission', 'real estate salesperson', 'accreditation', 'license'],
            minMatches: 1
        },
        dhsud: {
            label: 'DHSUD Certificate',
            keywords: ['dhsud', 'hlurb', 'department of human settlements', 'registration', 'certificate'],
            minMatches: 1
        }
    };

    var stateByInputId = Object.create(null);
    var tokenByInputId = Object.create(null);
    var pdfJsLoaderPromise = null;
    var tesseractLoaderPromise = null;

    function normalizeText(text) {
        return String(text || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function ensureScript(src) {
        return new Promise(function (resolve, reject) {
            var existing = document.querySelector('script[data-doc-validator-src="' + src + '"]');
            if (existing) {
                if (existing.getAttribute('data-loaded') === 'true') {
                    resolve();
                    return;
                }
                existing.addEventListener('load', function () { resolve(); }, { once: true });
                existing.addEventListener('error', function () { reject(new Error('Failed to load ' + src)); }, { once: true });
                return;
            }

            var script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.defer = true;
            script.setAttribute('data-doc-validator-src', src);
            script.addEventListener('load', function () {
                script.setAttribute('data-loaded', 'true');
                resolve();
            }, { once: true });
            script.addEventListener('error', function () {
                reject(new Error('Failed to load ' + src));
            }, { once: true });
            document.head.appendChild(script);
        });
    }

    async function loadPdfJs() {
        if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_JS_WORKER_CDN;
            return window.pdfjsLib;
        }
        if (!pdfJsLoaderPromise) {
            pdfJsLoaderPromise = ensureScript(PDF_JS_CDN).then(function () {
                if (!window.pdfjsLib) {
                    throw new Error('pdfjsLib unavailable after script load.');
                }
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_JS_WORKER_CDN;
                return window.pdfjsLib;
            });
        }
        return pdfJsLoaderPromise;
    }

    async function loadTesseract() {
        if (window.Tesseract) {
            return window.Tesseract;
        }
        if (!tesseractLoaderPromise) {
            tesseractLoaderPromise = ensureScript(TESSERACT_CDN).then(function () {
                if (!window.Tesseract) {
                    throw new Error('Tesseract unavailable after script load.');
                }
                return window.Tesseract;
            });
        }
        return tesseractLoaderPromise;
    }

    async function extractTextFromPdf(file) {
        var pdfjsLib = await loadPdfJs();
        var buffer = await file.arrayBuffer();
        var loadingTask = pdfjsLib.getDocument({ data: buffer });
        var pdf = await loadingTask.promise;
        var pageCount = Math.min(pdf.numPages || 0, 4);
        var chunks = [];

        for (var pageNo = 1; pageNo <= pageCount; pageNo += 1) {
            var page = await pdf.getPage(pageNo);
            var content = await page.getTextContent();
            var pageText = (content.items || []).map(function (item) {
                return item && item.str ? item.str : '';
            }).join(' ');
            if (pageText) {
                chunks.push(pageText);
            }
        }

        return chunks.join(' ');
    }

    async function extractTextFromImage(file) {
        var Tesseract = await loadTesseract();
        var result = await Tesseract.recognize(file, 'eng');
        return result && result.data && result.data.text ? result.data.text : '';
    }

    async function extractDocumentText(file) {
        var type = String(file.type || '').toLowerCase();
        var name = String(file.name || '').toLowerCase();

        if (type.indexOf('pdf') !== -1 || /\.pdf$/i.test(name)) {
            return extractTextFromPdf(file);
        }
        if (type.indexOf('image/') === 0 || /\.(jpg|jpeg|png)$/i.test(name)) {
            return extractTextFromImage(file);
        }
        return '';
    }

    function keywordMatchCount(text, keywords) {
        var normalized = normalizeText(text);
        if (!normalized) return 0;

        var matches = 0;
        for (var i = 0; i < keywords.length; i += 1) {
            var term = normalizeText(keywords[i]);
            if (term && normalized.indexOf(term) !== -1) {
                matches += 1;
            }
        }
        return matches;
    }

    function getInputParts(input) {
        var docId = (input && input.getAttribute('data-doc-id')) || '';
        var row = docId ? document.getElementById('row-' + docId) : null;
        var feedback = docId ? document.getElementById('feedback-' + docId) : null;
        var loader = docId ? document.getElementById('loader-' + docId) : null;
        var trigger = input ? document.querySelector('[data-upload-trigger="' + input.id + '"]') : null;
        return {
            docId: docId,
            row: row,
            feedback: feedback,
            loader: loader,
            trigger: trigger
        };
    }

    function emitValidationEvent(input, detail) {
        var payload = detail || {};
        payload.inputId = input ? input.id : '';
        payload.docId = input ? (input.getAttribute('data-doc-id') || '') : '';
        document.dispatchEvent(new CustomEvent('doc-validator:result', { detail: payload }));
    }

    function paintState(input, state) {
        var parts = getInputParts(input);
        var row = parts.row;
        var feedback = parts.feedback;
        var loader = parts.loader;
        var trigger = parts.trigger;

        if (row) {
            row.classList.toggle('is-checking', state.status === 'checking');
            row.classList.toggle('is-valid', state.status === 'valid');
            row.classList.toggle('is-invalid', state.status === 'invalid');
        }

        if (trigger) {
            trigger.classList.toggle('is-checking', state.status === 'checking');
            trigger.classList.toggle('is-invalid', state.status === 'invalid');
            trigger.classList.toggle('has-file', state.status === 'valid' || state.status === 'checking');
        }

        if (feedback) {
            feedback.textContent = state.message || '';
            feedback.classList.toggle('show', Boolean(state.message));
            feedback.classList.toggle('ok', state.status === 'valid');
            feedback.classList.toggle('bad', state.status === 'invalid');
            feedback.classList.toggle('checking', state.status === 'checking');
        }

        if (loader) {
            loader.hidden = state.status !== 'checking';
        }
    }

    function setInputState(input, state) {
        if (!input || !input.id) return;
        stateByInputId[input.id] = state;
        paintState(input, state);
        emitValidationEvent(input, state);
    }

    function getFileExtension(name) {
        var fileName = String(name || '').toLowerCase();
        var parts = fileName.split('.');
        return parts.length > 1 ? parts.pop() : '';
    }

    function isAllowedType(file, rule) {
        var type = String(file.type || '').toLowerCase();
        var ext = getFileExtension(file.name);

        if (rule && Array.isArray(rule.allowedExtensions) && rule.allowedExtensions.length) {
            var ruleExts = rule.allowedExtensions.map(function (value) {
                return String(value || '').toLowerCase();
            });
            var ruleMimes = Array.isArray(rule.allowedMimeTypes)
                ? rule.allowedMimeTypes.map(function (value) { return String(value || '').toLowerCase(); })
                : [];
            if (ruleExts.indexOf(ext) !== -1) return true;
            if (type && ruleMimes.indexOf(type) !== -1) return true;
            return false;
        }

        if (type.indexOf('pdf') !== -1 || ext === 'pdf') return true;
        if (type === 'image/jpeg' || type === 'image/jpg' || type === 'image/png') return true;
        if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') return true;
        return false;
    }

    function fallbackFilenameCheck(fileName, rule) {
        var normalized = normalizeText(fileName || '');
        if (!normalized || !rule || !rule.keywords || !rule.keywords.length) return false;
        return keywordMatchCount(normalized, rule.keywords) > 0;
    }

    async function validateInput(input) {
        if (!input || !input.id) {
            return { valid: false, status: 'invalid', message: 'Invalid document input.' };
        }

        var docId = input.getAttribute('data-doc-id') || '';
        var rule = DOC_RULES[docId] || null;
        var file = input.files && input.files.length > 0 ? input.files[0] : null;

        if (!file) {
            var emptyState = { valid: false, status: 'idle', message: '' };
            setInputState(input, emptyState);
            return emptyState;
        }

        if (!isAllowedType(file, rule)) {
            var typeStateMessage = 'Only PDF, JPG, JPEG, and PNG are accepted.';
            if (rule && Array.isArray(rule.allowedExtensions) && rule.allowedExtensions.length) {
                typeStateMessage = 'Only ' + rule.allowedExtensions.map(function (ext) {
                    return String(ext || '').toUpperCase();
                }).join(', ') + ' are accepted.';
            }
            var typeState = { valid: false, status: 'invalid', message: typeStateMessage };
            setInputState(input, typeState);
            return typeState;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            var sizeState = { valid: false, status: 'invalid', message: 'File is too large. Maximum size is 10MB.' };
            setInputState(input, sizeState);
            return sizeState;
        }

        var token = (tokenByInputId[input.id] || 0) + 1;
        tokenByInputId[input.id] = token;

        var checkingState = { valid: false, status: 'checking', message: 'Validating document content...' };
        setInputState(input, checkingState);

        try {
            var extractedText = await extractDocumentText(file);

            if (tokenByInputId[input.id] !== token) {
                return stateByInputId[input.id] || checkingState;
            }

            if (!rule) {
                var genericOk = { valid: true, status: 'valid', message: 'File is ready to upload.' };
                setInputState(input, genericOk);
                return genericOk;
            }

            if (rule.minMatches === 0) {
                var imageOk = { valid: true, status: 'valid', message: rule.label + ' detected. Ready to upload.' };
                setInputState(input, imageOk);
                return imageOk;
            }

            var cleanedText = normalizeText(extractedText);
            if (!cleanedText) {
                var weakMatch = fallbackFilenameCheck(file.name, rule);
                if (weakMatch) {
                    var fallbackOk = { valid: true, status: 'valid', message: 'Looks like a ' + rule.label + ' file by filename.' };
                    setInputState(input, fallbackOk);
                    return fallbackOk;
                }
                var noText = { valid: false, status: 'invalid', message: 'Unable to read document text. Try a clearer scan or searchable PDF.' };
                setInputState(input, noText);
                return noText;
            }

            var matchCount = keywordMatchCount(cleanedText, rule.keywords || []);
            var needed = Number(rule.minMatches || 1);

            if (matchCount >= needed) {
                var success = { valid: true, status: 'valid', message: rule.label + ' detected. Ready to upload.' };
                setInputState(input, success);
                return success;
            }

            var invalid = {
                valid: false,
                status: 'invalid',
                message: 'This file does not look like ' + rule.label + '. Please upload the correct document.'
            };
            setInputState(input, invalid);
            return invalid;
        } catch (error) {
            if (tokenByInputId[input.id] !== token) {
                return stateByInputId[input.id] || checkingState;
            }

            var fallback = fallbackFilenameCheck(file.name, rule);
            if (fallback) {
                var gracefulSuccess = {
                    valid: true,
                    status: 'valid',
                    message: 'Content service unavailable. Filename suggests the correct document type.'
                };
                setInputState(input, gracefulSuccess);
                return gracefulSuccess;
            }

            var failure = {
                valid: false,
                status: 'invalid',
                message: 'Validation failed. Please upload a readable PDF/image and try again.'
            };
            setInputState(input, failure);
            return failure;
        }
    }

    function getStateByInputId(inputId) {
        return stateByInputId[inputId] || null;
    }

    function isInputValid(inputId) {
        var state = getStateByInputId(inputId);
        return Boolean(state && state.status === 'valid' && state.valid);
    }

    function clearInputState(input) {
        if (!input || !input.id) return;
        delete stateByInputId[input.id];
        var idleState = { valid: false, status: 'idle', message: '' };
        paintState(input, idleState);
        emitValidationEvent(input, idleState);
    }

    window.DocValidator = {
        validateInput: validateInput,
        getStateByInputId: getStateByInputId,
        isInputValid: isInputValid,
        clearInputState: clearInputState
    };
})();
