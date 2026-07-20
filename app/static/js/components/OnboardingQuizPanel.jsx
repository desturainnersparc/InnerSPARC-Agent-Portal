function getCsrfToken() {
  var raw = typeof document !== 'undefined' ? (document.cookie || '') : '';
  var parts = raw ? raw.split(';') : [];
  for (var i = 0; i < parts.length; i += 1) {
    var cookie = parts[i].trim();
    if (cookie.indexOf('csrftoken=') === 0) {
      return decodeURIComponent(cookie.slice('csrftoken='.length));
    }
  }
  return '';
}

function postQuizScore(stepKey, score) {
  return fetch('/portal-onboarding/step-complete/', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken()
    },
    body: JSON.stringify({
      step_key: stepKey || 'beta_step_agent_readiness_quiz_done',
      score: score
    })
  }).then(function (response) {
    return response.json().catch(function () { return {}; }).then(function (payload) {
      return { ok: response.ok && payload && payload.ok !== false };
    });
  }).catch(function () {
    return { ok: false };
  });
}

function computeScore(questions, answers) {
  if (!Array.isArray(questions) || !questions.length) return 0;

  var totalWithAnswerKey = questions.filter(function (q) {
    return typeof q.correctIndex === 'number';
  }).length;

  if (!totalWithAnswerKey) return 0;

  var correct = 0;
  questions.forEach(function (q, i) {
    if (typeof q.correctIndex === 'number' && answers[i] === q.correctIndex) {
      correct += 1;
    }
  });

  return Math.round((correct / totalWithAnswerKey) * 100);
}

function OnboardingQuizPanel(props) {
  var ReactRef = typeof window !== 'undefined' ? window.React : null;
  if (!ReactRef) return null;

  var questions = Array.isArray(props.questions) ? props.questions : [];
  var useState = ReactRef.useState;

  var _stateIndex = useState(typeof props.initialIndex === 'number' ? props.initialIndex : 0);
  var index = _stateIndex[0];
  var setIndex = _stateIndex[1];

  var _stateAnswers = useState(Array.isArray(props.initialAnswers) ? props.initialAnswers.slice() : []);
  var answers = _stateAnswers[0];
  var setAnswers = _stateAnswers[1];

  var _statePrevIndex = useState(null);
  var prevIndex = _statePrevIndex[0];
  var setPrevIndex = _statePrevIndex[1];

  var _stateAnimating = useState(false);
  var isAnimating = _stateAnimating[0];
  var setIsAnimating = _stateAnimating[1];

  var _stateDone = useState(false);
  var done = _stateDone[0];
  var setDone = _stateDone[1];

  var _stateMessage = useState('');
  var message = _stateMessage[0];
  var setMessage = _stateMessage[1];

  var _stateSubmitting = useState(false);
  var submitting = _stateSubmitting[0];
  var setSubmitting = _stateSubmitting[1];

  var _stateCompleting = useState(false);
  var completing = _stateCompleting[0];
  var setCompleting = _stateCompleting[1];

  var _stateDirection = useState('next');
  var direction = _stateDirection[0];
  var setDirection = _stateDirection[1];

  var _stateConfirmKey = useState('');
  var confirmKey = _stateConfirmKey[0];
  var setConfirmKey = _stateConfirmKey[1];

  var ANIM_MS = 300;
  var REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COMPLETE_ANIM_MS = REDUCE_MOTION ? 0 : 820;

  var selected = typeof answers[index] === 'number' ? answers[index] : null;
  var letters = ['A', 'B', 'C', 'D'];

  function selectChoice(choiceIndex) {
    if (done || isAnimating || completing) return;
    var next = answers.slice();
    next[index] = choiceIndex;
    setAnswers(next);

    if (!REDUCE_MOTION) {
      var key = String(index) + ':' + String(choiceIndex);
      setConfirmKey(key);
      window.setTimeout(function () {
        setConfirmKey(function (current) {
          return current === key ? '' : current;
        });
      }, 220);
    }
  }

  function goNext() {
    if (done || selected === null || isAnimating || completing) return;
    if (index < questions.length - 1) {
      if (REDUCE_MOTION) {
        setIndex(index + 1);
        return;
      }
      setDirection('next');
      setPrevIndex(index); // keep current slide as outgoing
      setIndex(index + 1); // set new incoming slide
      setIsAnimating(true);
      window.setTimeout(function () {
        setPrevIndex(null);
        setIsAnimating(false);
        // focus first choice of new slide
        window.setTimeout(function () {
          try {
            var root = document.getElementById('tplQuizRoot') || document;
            var firstChoice = root.querySelector('.oqp-choice');
            if (firstChoice && typeof firstChoice.focus === 'function') firstChoice.focus();
          } catch (e) {}
        }, 20);
      }, ANIM_MS);
      return;
    }
    finalizeQuiz();
  }

  function goPrev() {
    if (done || index <= 0 || isAnimating || completing) return;
    if (REDUCE_MOTION) {
      setIndex(index - 1);
      return;
    }
    setDirection('prev');
    setPrevIndex(index); // outgoing is current
    setIndex(index - 1); // incoming is previous
    setIsAnimating(true);
    window.setTimeout(function () {
      setPrevIndex(null);
      setIsAnimating(false);
      window.setTimeout(function () {
        try {
          var root = document.getElementById('tplQuizRoot') || document;
          var firstChoice = root.querySelector('.oqp-choice');
          if (firstChoice && typeof firstChoice.focus === 'function') firstChoice.focus();
        } catch (e) {}
      }, 20);
    }, ANIM_MS);
  }

  function finalizeQuiz() {
    if (submitting || completing || done) return;
    var score = computeScore(questions, answers);
    var scoreMessage = score >= 80 ? 'You are ready to proceed.' : 'You need at least 80% to pass.';

    setCompleting(true);
    setMessage(score >= 80 ? 'Great work. Locking in your score...' : 'Checking your score and preparing feedback...');
    setSubmitting(true);

    window.setTimeout(function () {
      setDone(true);
      setCompleting(false);
      setMessage(scoreMessage);

      postQuizScore(props.stepKey, score).then(function (result) {
        setSubmitting(false);
        if (result && result.ok && typeof props.onComplete === 'function') {
          props.onComplete({ score: score, answers: answers.slice() });
        }
      });
    }, COMPLETE_ANIM_MS);
  }

  function onChoiceKeyDown(event, choiceIndex) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectChoice(choiceIndex);
    }
  }

  // build slides for rendering: outgoing (prevIndex) and incoming (index)
  var slides = [];
  function slideContentFor(i) {
    var q = questions[i] || { prompt: '', choices: [] };
    var questionEnterClass = i === index && !done && !REDUCE_MOTION ? ' oqp-question--enter' : '';
    return ReactRef.createElement('div', { key: 'question-' + i, className: 'oqp-slide-inner' },
      !done && ReactRef.createElement('h4', { className: 'oqp-question mt-4 text-xl font-medium leading-7 mb-4' + questionEnterClass }, q.prompt || ''),
      !done && ReactRef.createElement('div', { className: 'oqp-choices space-y-4', role: 'radiogroup', 'aria-label': 'Quiz answers' },
        (q.choices || []).map(function (choice, choiceIndex) {
          var isSel = (i === index) ? (selected === choiceIndex) : (i === prevIndex && answers[i] === choiceIndex);
          var selClass = isSel ? ' is-selected' : '';
          var confirmClass = confirmKey === (String(i) + ':' + String(choiceIndex)) ? ' is-confirm' : '';
          var revealClass = i === index && !done ? (' oqp-choice--enter oqp-stagger-' + (choiceIndex % 6)) : '';
          return ReactRef.createElement('button', {
            key: 'choice-' + i + '-' + choiceIndex,
            type: 'button',
            className: 'oqp-choice w-full text-left px-4 py-4 rounded-md leading-7 transition-colors duration-150 motion-reduce:transition-none bg-transparent' + selClass + confirmClass + revealClass,
            role: 'radio',
            'aria-checked': isSel ? 'true' : 'false',
            onClick: function () { if (i === index) selectChoice(choiceIndex); },
            onKeyDown: function (event) { if (i === index) onChoiceKeyDown(event, choiceIndex); }
          },
            ReactRef.createElement('span', { className: 'oqp-choice-circle', 'aria-hidden': 'true' },
              ReactRef.createElement('span', { className: 'oqp-choice-dot' })
            ),
            ReactRef.createElement('span', { className: 'oqp-choice-letter' }, letters[choiceIndex] || String.fromCharCode(65 + choiceIndex)),
            ReactRef.createElement('span', { className: 'oqp-choice-text' }, choice)
          );
        })
      ),
      (done || completing) && ReactRef.createElement('p', { className: 'oqp-result leading-6' + (completing ? ' is-completing' : ''), role: 'status', 'aria-live': 'polite' }, message)
    );
  }

  if (prevIndex !== null) {
    // outgoing slide (animate exit)
    slides.push(ReactRef.createElement('div', {
      key: 'outgoing',
      className: 'oqp-slide dir-exit-' + (direction === 'next' ? 'next' : 'prev') + ' is-hidden'
    }, slideContentFor(prevIndex)));
    // incoming slide (animate enter)
    slides.push(ReactRef.createElement('div', {
      key: 'incoming',
      className: 'oqp-slide dir-enter-' + (direction === 'next' ? 'next' : 'prev') + ' is-visible'
    }, slideContentFor(index)));
  } else {
    // single current slide
    slides.push(ReactRef.createElement('div', { key: 'single', className: 'oqp-slide dir-enter-' + (direction === 'next' ? 'next' : 'prev') + ' is-visible' }, slideContentFor(index)));
  }

  // ensure wrapper id for focus helper
  var slidesContainer = ReactRef.createElement('div', { id: 'tplQuizRoot', className: 'oqp-slides-container' }, slides);

  return ReactRef.createElement('section', { className: 'oqp-panel w-full max-w-2xl mx-auto px-6 text-gray-900 leading-7' + (completing ? ' oqp-completing' : '') },
    slidesContainer,
    ReactRef.createElement('footer', { className: 'tpl1-foot' },
      ReactRef.createElement('span', { className: 'tpl1-note' }, (done || completing) ? '' : ('Question ' + (index + 1) + ' of ' + questions.length)),
      ReactRef.createElement('div', { className: 'tpl1-controls' },
        ReactRef.createElement('button', {
          type: 'button',
          className: 'tpl1-btn',
          onClick: goPrev,
          disabled: done || completing || index === 0 || isAnimating,
          'aria-disabled': done || completing || index === 0 || isAnimating ? 'true' : 'false'
        }, 'Previous'),
        ReactRef.createElement('button', {
          type: 'button',
          className: 'tpl1-btn primary',
          onClick: goNext,
          disabled: done || completing ? true : (selected === null || submitting || isAnimating),
          'aria-disabled': done || completing ? 'true' : ((selected === null || submitting || isAnimating) ? 'true' : 'false')
        }, completing ? 'Finalizing...' : 'Next')
      )
    )
  );
}

if (typeof window !== 'undefined') {
  window.OnboardingQuizPanel = OnboardingQuizPanel;
}

export default OnboardingQuizPanel;
