(function () {
    var root = document.getElementById('tpl1Root');
    if (!root) return;

    // Keep strict sequential onboarding locks enabled in normal app usage.
    var DEV_UNLOCK_ALL_ONBOARDING_STEPS = false;

    // Temporary development override: keep empty unless you want to force a shared source.
    var DEV_OVERRIDE_VIDEO_SRC = '';

    // Keep module gating strict; do not bypass prerequisites.
    var DEV_UNLOCK_MODULE_3 = false;

    var groupsEl = document.getElementById('tplBetaGroups');
    var panelEl = document.getElementById('tplBetaPanel');
    var stepCountBadgeEl = document.getElementById('tpl1StepCountBadge');
    var stepsLeftBadgeEl = document.getElementById('tpl1StepsLeftBadge');
    var currentEl = document.getElementById('tplBetaCurrent');
    var percentEl = document.getElementById('tplBetaPercentText');
    var fillEl = document.getElementById('tplBetaFill');
    var trackEl = document.getElementById('tplBetaTrack');
    var appEl = root.querySelector('.tpl1-app');
    var sidebarEl = document.getElementById('tpl1Sidebar');
    var sideToggleBtn = document.getElementById('tpl1SideToggle');
    var mobileBackdrop = document.getElementById('tpl1MobileBackdrop');
    var themeBtn = document.getElementById('tpl1Theme');
    var sideProfileEl = document.getElementById('tpl1SideProfile');
    var sideProfileToggleBtn = document.getElementById('tpl1SideProfileToggle');
    var sideProfileActions = document.getElementById('tpl1SideProfileActions');
    var sideUserNameEl = document.getElementById('tpl1SideUserName');
    var sideAvatarEl = document.getElementById('tpl1SideAvatar');
    var originalSideAvatarHtml = sideAvatarEl ? sideAvatarEl.innerHTML : '';
    var userAvatarHtml = originalSideAvatarHtml;
    var accountSettingsBtn = document.getElementById('tpl1AccountSettings');
    var signOutBtn = document.getElementById('tpl1SignOut');
    var accountModal = document.getElementById('tpl1AccountModal');
    var accountBackdrop = document.getElementById('tpl1AccountBackdrop');
    var accountCloseBtn = document.getElementById('tpl1AccountClose');
    var aboutModal = document.getElementById('tpl1AboutModal');
    var aboutBackdrop = document.getElementById('tpl1AboutBackdrop');
    var aboutCloseBtn = document.getElementById('tpl1AboutClose');
    var videoQuizModal = document.getElementById('tpl1VideoQuizModal');
    var videoQuizBackdrop = document.getElementById('tpl1VideoQuizBackdrop');
    var videoQuizCloseBtn = document.getElementById('tpl1VideoQuizClose');
    var videoQuizRoot = document.getElementById('tpl1VideoQuizRoot');
    var accountForm = document.getElementById('tpl1AccountForm');
    var accountPhoneInput = document.getElementById('tpl1AccountPhone');
    var accountPhoneError = document.getElementById('tpl1AccountPhoneError');
    var accountSaveMessage = document.getElementById('tpl1AccountSaveMessage');
    var settingsGrid = document.getElementById('tpl1SettingsGrid');
    var accountAvatarImageEl = document.getElementById('tpl1AccountAvatarImage');
    var accountAvatarEditBtn = document.getElementById('tpl1AccountAvatarEdit');
    var accountAvatarUploadInputEl = document.getElementById('tpl1AccountAvatarInput');
    var accountAvatarUploadInFlight = false;
    var accountAvatarFeedbackTimer = null;
    var aboutModalTriggerEl = null;
    var aboutCtaDelegatedWired = false;
    var aboutModalCloseTimer = null;
    var videoQuizModalCloseTimer = null;
    var videoQuizModalClearTimer = null;
    var videoQuizModalOpenTimer = null;
    var panelAnimationTimer = null;
    var overviewChallengeTickerTimer = null;
    var currentUserName = (root.getAttribute('data-user-name') || '').trim() || 'Agent';
    var onboardingPrefill = {
        firstName: (root.getAttribute('data-account-first-name') || '').trim(),
        lastName: (root.getAttribute('data-account-last-name') || '').trim(),
        email: (root.getAttribute('data-account-email') || '').trim(),
        phoneNumber: (root.getAttribute('data-account-phone') || '').trim(),
        birthdate: (root.getAttribute('data-account-birthdate') || '').trim(),
        gender: (root.getAttribute('data-account-gender') || '').trim()
    };
    var onboardingApi = {
        profileDataUrl: (root.getAttribute('data-onboarding-data-url') || '/portal-onboarding/profile-data/').trim(),
        profileIdentitySaveUrl: '/portal-onboarding/profile-identity/save/',
        agentDocumentsSaveUrl: '/portal-onboarding/agent-documents/save/',
        accountAvatarUploadUrl: '/portal-onboarding/avatar/upload/',
        completionUrl: '/portal-onboarding/complete/',
        completionEmailStatusUrl: '/portal-onboarding/completion-email-status/'
    };
    var onboardingProfileData = {
        residential_address: '',
        agent_requirement_documents: {
            valid_government_id_1: null,
            valid_government_id_2: null,
            tin_verification: null,
            photo_2x2: null,
            photo_1x1: null,
        }
    };
    var uploadFieldByInputId = {
        betaValidGovernmentId1: 'valid_government_id_1',
        betaValidGovernmentId2: 'valid_government_id_2',
        betaDocTin: 'tin_verification',
        betaPhoto2x2: 'photo_2x2',
        betaPhoto1x1: 'photo_1x1',
    };
    var uploadApiFieldByInputId = {
        betaValidGovernmentId1: 'proof_of_education',
        betaValidGovernmentId2: 'government_clearance_nbi',
        betaDocTin: 'tin_verification',
        betaPhoto2x2: 'photo_2x2',
        betaPhoto1x1: 'photo_1x1',
    };
    var uploadDocIdByInputId = {
        betaValidGovernmentId1: 'govid1',
        betaValidGovernmentId2: 'govid2',
        betaDocTin: 'tin',
        betaPhoto2x2: 'photo2x2',
        betaPhoto1x1: 'photo1x1',
    };
                // Per-video quiz questions for all modules
                // Use the video contentId as the key (see TRAINING_VIDEO_MODULES for contentId values)
                var videoQuizQuestions = {
                                                            // Module 4: Success Mindset (13 videos)
                                                            'wheres-the-master-key': [
                                                                { prompt: '1. What does the phrase “Where’s the key?” symbolize in real estate?', choices: [
                                                                    'Looking for the actual key to a house',
                                                                    'Giving up when something is hard',
                                                                    'Asking, “What can unlock this situation?”',
                                                                    'Only using physical keys to open doors'
                                                                ] },
                                                                { prompt: '2. When a deal falls through, what’s the mindset-based response encouraged by this module?', choices: [
                                                                    '“This is the end of my career.”',
                                                                    '“Deals always fall apart.”',
                                                                    '“Where’s the key? What can I learn or do next?”',
                                                                    'It’s the client’s fault.'
                                                                ] },
                                                                { prompt: '3. What is more powerful than frustration, according to the module?', choices: [
                                                                    'Hustling harder',
                                                                    'Avoiding risk',
                                                                    'Curiosity',
                                                                    'Winning every deal'
                                                                ] }
                                                            ],
                                                            'tell-yourself-a-lie': [
                                                                { prompt: '1. What does “Tell Yourself a Lie” mean in this module?', choices: [
                                                                    'Ignore reality and pretend everything is fine',
                                                                    'Trick other people into trusting you',
                                                                    'Say empowering things to yourself until they become your truth',
                                                                    'Lie about your sales numbers'
                                                                ] },
                                                                { prompt: '2. Which of the following is an example of a limiting belief?', choices: [
                                                                    'I can learn anything I set my mind to.',
                                                                    'I always follow up and close deals.',
                                                                    'I’m not good enough to be a top agent.',
                                                                    'I create opportunities daily.'
                                                                ] },
                                                                { prompt: '3. What happens when you repeat a new, empowering story to yourself?', choices: [
                                                                    'Nothing changes',
                                                                    'Your brain starts to believe it and your behavior changes',
                                                                    'You confuse yourself',
                                                                    'You become dishonest'
                                                                ] }
                                                            ],
                                                            'gutom-ka': [
                                                                { prompt: '1. What does “GUTOM KA?” mean in the context of real estate?', choices: [
                                                                    'You forgot to eat lunch',
                                                                    'You\'re desperate for clients',
                                                                    'You have the inner drive and hunger to succeed',
                                                                    'You’re working just for commissions'
                                                                ] },
                                                                { prompt: '2. What’s the difference between hunger and desperation?', choices: [
                                                                    'Hunger is slow, desperation is fast',
                                                                    'Hunger is powerful and purpose-driven, desperation is fear-based',
                                                                    'They mean the same thing',
                                                                    'Desperation is better for closing deals'
                                                                ] },
                                                                { prompt: '3. Which of the following is a sign of a “hungry” agent?', choices: [
                                                                    'Waiting for leads to come in',
                                                                    'Avoiding cold calls',
                                                                    'Following up daily and staying consistent',
                                                                    'Saying “I’ll try again next month”'
                                                                ] }
                                                            ],
                                                            'lost-gold': [
                                                                { prompt: '1. What does “Lost Gold” represent in the real estate world?', choices: [
                                                                    'Jewelry found during a showing',
                                                                    'Old or forgotten opportunities, skills, and relationships',
                                                                    'A new property listing',
                                                                    'A hidden vault of cash'
                                                                ] },
                                                                { prompt: '2. Which of the following could be considered “lost gold”?', choices: [
                                                                    'A brand-new cold lead',
                                                                    'A new app you haven’t downloaded',
                                                                    'A past client you haven’t followed up with',
                                                                    'A script you’ve never written'
                                                                ] },
                                                                { prompt: '3. What’s one action the “Lost Gold” mindset encourages?', choices: [
                                                                    'Ignore your old contacts',
                                                                    'Always start from scratch',
                                                                    'Dig into your past client list and reconnect',
                                                                    'Keep waiting for new leads'
                                                                ] }
                                                            ],
                                                            'dont-overcomplicate': [
                                                                { prompt: '1. What is the main message of the “Don’t Overcomplicate” mindset?', choices: [
                                                                    'Try every strategy at once',
                                                                    'Wait until everything is perfect',
                                                                    'Focus on simple, consistent actions',
                                                                    'Avoid doing anything new'
                                                                ] },
                                                                { prompt: '2. What usually happens when you overthink or overcomplicate your tasks?', choices: [
                                                                    'You move faster',
                                                                    'You get better results',
                                                                    'You lose momentum and feel stuck',
                                                                    'You attract more clients'
                                                                ] },
                                                                { prompt: '3. Which of these is a basic, high-impact activity in real estate?', choices: [
                                                                    'Creating a fancy logo',
                                                                    'Making 5 follow-up calls',
                                                                    'Buying new business cards',
                                                                    'Organizing your desktop folders'
                                                                ] }
                                                            ],
                                                            'be-like-spotify': [
                                                                { prompt: '1. What is the main message of “Be Like Spotify”?', choices: [
                                                                    'Be loud and pushy',
                                                                    'Sell constantly to get attention',
                                                                    'Be consistent, personal, and valuable',
                                                                    'Copy what other agents do'
                                                                ] },
                                                                { prompt: '2. Why do people keep using Spotify?', choices: [
                                                                    'It surprises them with high prices',
                                                                    'It offers random music',
                                                                    'It’s always relevant and shows up consistently',
                                                                    'It sends a lot of ads'
                                                                ] },
                                                                { prompt: '3. In real estate, what does it mean to “be the playlist”?', choices: [
                                                                    'Show up with value your audience enjoys',
                                                                    'Play music during open houses',
                                                                    'Change your branding every week',
                                                                    'Send the same message to everyone'
                                                                ] }
                                                            ],
                                                            'deathbed': [
                                                                { prompt: '1. What is the main point of the “Deathbed” mindset in real estate?', choices: [
                                                                    'To wait for the perfect time to act',
                                                                    'To avoid taking risks',
                                                                    'To reflect on whether you will regret not trying',
                                                                    'To focus on the easy tasks only'
                                                                ] },
                                                                { prompt: '2. What should you ask yourself before making a decision in your real estate business?', choices: [
                                                                    'Will this make me the most money?',
                                                                    'Will this matter on my deathbed?',
                                                                    'Will this make me famous?',
                                                                    'Will I have time to do it later?'
                                                                ] },
                                                                { prompt: '3. What is the true fear according to the “Deathbed” mindset?', choices: [
                                                                    'Fear of success',
                                                                    'Fear of rejection',
                                                                    'Fear of regret',
                                                                    'Fear of competition'
                                                                ] }
                                                            ],
                                                            'eyes-on-the-prize': [
                                                                { prompt: '1. What is the main idea of “EYES ON THE PRIZE”?', choices: [
                                                                    'Focus on every small distraction',
                                                                    'Focus on your long-term goals and vision',
                                                                    'Ignore challenges and hope for the best',
                                                                    'Change your goals frequently'
                                                                ] },
                                                                { prompt: '2. What should you do when you face a setback in real estate?', choices: [
                                                                    'Give up and move to a different industry',
                                                                    'Forget your goals and relax',
                                                                    'Remember your long-term prize and keep going',
                                                                    'Blame others for the failure'
                                                                ] },
                                                                { prompt: '3. Which of these is a key action for staying focused on your real estate goals?', choices: [
                                                                    'Constantly checking your social media',
                                                                    'Consistently following up with clients',
                                                                    'Always changing your business strategy',
                                                                    'Working on multiple projects at once'
                                                                ] }
                                                            ],
                                                            'keep-a-track-record': [
                                                                { prompt: '1. What is the main reason to keep a track record in real estate?', choices: [
                                                                    'To guess if you are doing well',
                                                                    'To measure and improve your activities',
                                                                    'To have extra paperwork',
                                                                    'To impress your friends'
                                                                ] },
                                                                { prompt: '2. What should you focus on tracking daily?', choices: [
                                                                    'Only closed deals',
                                                                    'Key activities like calls, meetings, and follow-ups',
                                                                    'How many properties you drive by',
                                                                    'Your favorite real estate memes'
                                                                ] },
                                                                { prompt: '3. What does your track record prove when you feel discouraged?', choices: [
                                                                    'That you are wasting time',
                                                                    'That you are making consistent effort',
                                                                    'That you should change careers',
                                                                    'That you should stop trying'
                                                                ] }
                                                            ],
                                                            'pocket-library': [
                                                                { prompt: '1. What is a "Pocket Library" in real estate?', choices: [
                                                                    'A collection of random books',
                                                                    'A set of key information you can access quickly',
                                                                    'A large real estate office',
                                                                    'A library you build at home'
                                                                ] },
                                                                { prompt: '2. Why is it important to have a Pocket Library?', choices: [
                                                                    'So you can impress people with trivia',
                                                                    'To answer client questions quickly and confidently',
                                                                    'To read books during open houses',
                                                                    'To avoid using your phone'
                                                                ] },
                                                                { prompt: '3. What type of information should you keep in your Pocket Library?', choices: [
                                                                    'Local market trends and buying/selling steps',
                                                                    'Favorite TV shows',
                                                                    'Your favorite recipes',
                                                                    'A list of vacation spots'
                                                                ] }
                                                            ],
                                                            'push-your-buttons': [
                                                                { prompt: '1. What does "pushing your button" mean in real estate?', choices: [
                                                                    'Waiting for the perfect day to work',
                                                                    'Triggering your own motivation and energy',
                                                                    'Only working when you feel good',
                                                                    'Asking someone else to motivate you'
                                                                ] },
                                                                { prompt: '2. Why is it important to push your own button every day?', choices: [
                                                                    'Because motivation happens by accident',
                                                                    'To control your energy and stay consistent',
                                                                    'So you can take more breaks',
                                                                    'Because someone will do it for you'
                                                                ] },
                                                                { prompt: '3. Which of the following is an example of pushing your button?', choices: [
                                                                    'Listening to a "power song" before making calls',
                                                                    'Taking a long nap before work',
                                                                    'Watching TV all morning',
                                                                    'Waiting for a client to call you first'
                                                                ] }
                                                            ],
                                                            'sweat-in-peace': [
                                                                { prompt: '1. What does "Sweet and Peace" mean in real estate?', choices: [
                                                                    'Being loud and aggressive to close deals',
                                                                    'Staying positive and calm, even under pressure',
                                                                    'Ignoring clients completely',
                                                                    'Working as little as possible'
                                                                ] },
                                                                { prompt: '2. Why is it important to stay peaceful during real estate transactions?', choices: [
                                                                    'So you can argue better with clients',
                                                                    'To impress your boss only',
                                                                    'Because calm agents win trust and save deals',
                                                                    'To finish work early every day'
                                                                ] },
                                                                { prompt: '3. What is one way to stay peaceful during a stressful situation?', choices: [
                                                                    'Deep breathing and positive self-talk',
                                                                    'Yelling at people',
                                                                    'Quitting real estate immediately',
                                                                    'Blaming others for problems'
                                                                ] }
                                                            ],
                                                            'welcome-the-unexpected': [
                                                                { prompt: '1. What is the main message of "Welcome to Unexpected"?', choices: [
                                                                    'Real estate is always predictable',
                                                                    'Real estate is full of surprises, and that’s normal',
                                                                    'Surprises should make you quit',
                                                                    'You should never work without a perfect plan'
                                                                ] },
                                                                { prompt: '2. When an unexpected problem happens, what should you do first?', choices: [
                                                                    'Panic immediately',
                                                                    'Blame someone else',
                                                                    'Find a solution quickly',
                                                                    'Stop working for the day'
                                                                ] },
                                                                { prompt: '3. What mindset should you have toward surprises in real estate?', choices: [
                                                                    'Expect everything to go wrong',
                                                                    'Hope nothing ever changes',
                                                                    'Stay flexible and strong',
                                                                    'Avoid clients who cause problems'
                                                                ] }
                                                            ],
                                                            //Module 12 (3 Videos)
                                                            'beta_video_118_done': [
                                                                { prompt: '1. Why should real estate agents view complaints as positive?', choices: [
                                                                    'They show clients are still engaged',
                                                                    'They mean the agent failed',
                                                                    'They are always personal attacks',
                                                                    'They show the client wants to cancel'
                                                                ] },
                                                                { prompt: '2. When a client complains, what’s the best first response?', choices: [
                                                                    'Get defensive and explain why it’s not your fault',
                                                                    'Listen actively and thank them for sharing',
                                                                    'Ignore them and hope they calm down',
                                                                    'Tell them it’s normal and move on'
                                                                ] },
                                                                { prompt: '3. What’s the key to handling complaints effectively?', choices: [
                                                                    'Blame the market',
                                                                    'Get emotional back at them',
                                                                    'Stay calm, listen, and focus on solutions',
                                                                    'Avoid talking about the complaint'
                                                                ] }
                                                            ],
                                                            'understand-and-agree': [
                                                                { prompt: '1. What is the first step when a client shares a concern?', choices: [
                                                                    'Ignore it',
                                                                    'Argue immediately',
                                                                    'Understand and agree',
                                                                    'Change the topic'
                                                                ] },
                                                                { prompt: '2. What is a good phrase to show you agree with a client’s feelings?', choices: [
                                                                    '“That’s not true.”',
                                                                    '“Yes, I understand how you feel.”',
                                                                    '“But that’s not how it works.”',
                                                                    '“You shouldn’t feel that way.”'
                                                                ] },
                                                                { prompt: '3. Why should you avoid saying “Yes, but…” when talking to clients?', choices: [
                                                                    'It can make them feel ignored',
                                                                    'It sounds confusing',
                                                                    'It makes the conversation longer',
                                                                    'It’s too formal'
                                                                ] }
                                                            ],
                                                            'empathy-vs-sympathy': [
                                                                { prompt: '1. What is the main difference between empathy and sympathy?', choices: [
                                                                    'Empathy means feeling sorry, sympathy means listening',
                                                                    'Empathy is about solving problems, sympathy is about helping',
                                                                    'Empathy is feeling with someone, sympathy is feeling for someone',
                                                                    'They mean the same thing'
                                                                ] },
                                                                { prompt: '2. Why is empathy important in real estate?', choices: [
                                                                    'It helps close deals faster',
                                                                    'It reduces paperwork',
                                                                    'It builds trust and deeper client relationships',
                                                                    'It’s required by real estate law'
                                                                ] },
                                                                { prompt: '3. A client says: “I’m overwhelmed with all these decisions.” What is an empathetic response?', choices: [
                                                                    '“Yeah, that’s real estate for you!”',
                                                                    '“You shouldn’t feel that way. It’s easy once you start.”',
                                                                    '“I understand — there’s a lot to think about. Let’s take it one step at a time together.”',
                                                                    '“You’ll be fine. Everyone figures it out.”'
                                                                ] }
                                                            ],
                                                            // ------------------- MODULE 13: OBJECTION HANDLING -------------------
                                                            'module-13-objection-handling': [
                                                                { prompt: '1. What is an objection in real estate?', choices: [
                                                                    'A client yelling at the agent',
                                                                    'A sign that the client is not interested at all',
                                                                    'A concern or question a client has before making a decision',
                                                                    'A legal complaint'
                                                                ] },
                                                                { prompt: '2. What does a good agent do when they hear an objection?', choices: [
                                                                    'Ignore it and keep talking',
                                                                    'End the conversation',
                                                                    'Get defensive',
                                                                    'Listen, understand, and respond calmly'
                                                                ] },
                                                                { prompt: '3. Which of the following is a common real estate objection?', choices: [
                                                                    '“I love your shoes!”',
                                                                    '“I already bought a house.”',
                                                                    '“The price is too high.”',
                                                                    '“I want to buy two houses today.”'
                                                                ] }
                                                            ],
                                                             'type-of-objections': [
                                                                 { prompt: '1. What is an objection in real estate?', choices: [
                                                                     'A client yelling at the agent',
                                                                     'A sign that the client is not interested at all',
                                                                     'A concern or question a client has before making a decision',
                                                                     'A legal complaint'
                                                                 ] },
                                                                 { prompt: '2. What does a good agent do when they hear an objection?', choices: [
                                                                     'Ignore it and keep talking',
                                                                     'End the conversation',
                                                                     'Get defensive',
                                                                     'Listen, understand, and respond calmly'
                                                                 ] },
                                                                 { prompt: '3. Which of the following is a common real estate objection?', choices: [
                                                                     '“I love your shoes!”',
                                                                     '“I already bought a house.”',
                                                                     '“The price is too high.”',
                                                                     '“I want to buy two houses today.”'
                                                                 ] }
                                                             ],
                                                            
                                        // Module 3: Money Mindset (5 videos)
                                        'mindset-1-youre-not-poor': [
                                            { prompt: 'What does being “poor” in real estate usually refer to?', choices: [
                                                'Having no nice clothes',
                                                'Not having enough money or experience',
                                                'Living far from the city',
                                                'Not having a car'
                                            ] },
                                            { prompt: 'Name two things you can use to succeed in real estate even without much money.', choices: [
                                                'Luck and fast talking',
                                                'Skills and strong relationships',
                                                'Free snacks and business cards',
                                                'Expensive clothes and a new phone'
                                            ] },
                                            { prompt: 'Fill in the blank: "You’re not poor — you are __________ for wealth."', choices: [
                                                'waiting',
                                                'begging',
                                                'preparing',
                                                'leaving'
                                            ] }
                                        ],
                                        'mindset-2-the-philippines-is-rich': [
                                            { prompt: 'Why is the Philippines considered a rich country?', choices: [
                                                'Because of gold mines',
                                                'Because of its natural beauty and hardworking people',
                                                'Because everyone is rich',
                                                'Because of big buildings'
                                            ] },
                                            { prompt: 'What kind of job helps people find homes and land?', choices: [
                                                'Doctor',
                                                'Engineer',
                                                'Real estate agent',
                                                'Chef'
                                            ] },
                                            { prompt: 'What do you need most to succeed in real estate?', choices: [
                                                'A big house',
                                                'A car',
                                                'A strong mindset',
                                                'A TV'
                                            ] }
                                        ],
                                        'mindset-3-pinoys-are-rich': [
                                            { prompt: 'What can real estate help Filipinos achieve?', choices: [
                                                'More free time',
                                                'Fame',
                                                'Wealth and financial growth',
                                                'Travel discounts'
                                            ] },
                                            { prompt: 'What is one common real estate investment of OFWs?', choices: [
                                                'Jewelry',
                                                'Real estate properties',
                                                'Cars',
                                                'Gadgets'
                                            ] },
                                            { prompt: 'How can a person earn money from a house or condo?', choices: [
                                                'Give it away',
                                                'Rent it out',
                                                'Hide it',
                                                'Paint it'
                                            ] }
                                        ],
                                        'mindset-4-strangers-friends': [
                                            { prompt: 'Why is relationship-building important in real estate?', choices: [
                                                'To quickly close one-time deals',
                                                'To avoid talking to new people',
                                                'Because trust leads to sales and referrals',
                                                'So you don’t have to advertise'
                                            ] },
                                            { prompt: 'What’s the first stage of turning a stranger into a friend?', choices: [
                                                'Selling them a property',
                                                'Engagement',
                                                'Awareness',
                                                'Relationship'
                                            ] },
                                            { prompt: 'What is one way to keep the relationship growing after first contact?', choices: [
                                                'Ignore their messages until they follow up',
                                                'Only contact them when you have a new listing',
                                                'Check in regularly and offer helpful information',
                                                'Send them price lists every day'
                                            ] }
                                        ],
                                        'mindset-5-we-have-more-than-enough': [
                                            { prompt: 'What does an abundance mindset in real estate believe?', choices: [
                                                'There are not enough clients to go around',
                                                'You must compete aggressively to succeed',
                                                'There are plenty of opportunities and success for everyone',
                                                'Only top agents deserve to win'
                                            ] },
                                            { prompt: 'What is a common sign of a scarcity mindset?', choices: [
                                                'Sharing listings with other agents',
                                                'Thinking there are too many agents in the area',
                                                'Collaborating on open houses',
                                                'Celebrating others\' wins'
                                            ] },
                                            { prompt: 'Which phrase aligns with an abundance mindset?', choices: [
                                                '“If I don’t get this client, I’ll go broke.”',
                                                '“There are always more opportunities coming.”',
                                                '“Another agent closed a deal, so I lost.”',
                                                '“Clients are limited, and I have to compete hard.”'
                                            ] }
                                        ],
                    // Module 1
                        'instruction-to-team-leader': [
                            { prompt: 'What is the biggest challenge you face in leading your sales team?', choices: ['Lack of motivation among team members','Difficulty in hitting sales targets','Poor communication within the team','High turnover of sales reps'] },
                            { prompt: 'How do you motivate your team to reach their monthly sales targets?', choices: ['Incentives and bonuses','Recognition and praise','Team competitions or challenges','One-on-one coaching sessions'] },
                            { prompt: 'Do you have regular team meetings? What are they like?', choices: ['Yes – Daily short meetings to check goals','Yes – Weekly meetings to review and plan','Yes – Both daily and weekly','No – We don’t do regular meetings'] }
                        ],
                        'intro-to-participants': [
                            { prompt: 'Who usually helps people buy or sell a property?', choices: ['Contractor','Real Estate Agent','Property Manager','Appraiser'] },
                            { prompt: 'Who is in charge of building or renovating houses or buildings?', choices: ['Lender','Developer','Contractor','Inspector'] },
                            { prompt: 'What is the main job of a property manager?', choices: ['Checking the value of a property','Taking care of rental properties every day','Handling legal papers','Selling houses'] }
                        ],
                        // Module 2: Setting the Stage (videos 1-5)
                        'law-of-the-iceberg': [
                            { prompt: 'What does "massive transformation" in real estate refer to?', choices: [
                                'Changing a house’s paint color',
                                'Big changes in how real estate works',
                                'Buying more snacks for open houses',
                                'Moving to a new office'
                            ] },
                            { prompt: 'Name two technologies that are transforming the real estate industry.', choices: [
                                'Email and posters',
                                'Drones and virtual tours',
                                'Telephones and paper maps',
                                'Calculators and pens'
                            ] },
                            { prompt: 'How has consumer behavior changed in modern real estate?', choices: [
                                'People buy homes without looking',
                                'People now search online and expect fast service',
                                'People don’t care about houses anymore',
                                'People only talk to banks'
                            ] }
                        ],
                        'law-of-the-summit': [
                            { prompt: 'Why is it important for real estate professionals to adopt a growth mindset during transformation?', choices: [
                                'To win prizes',
                                'To keep learning and adjust to big changes',
                                'So they can take longer breaks',
                                'To avoid doing extra work'
                            ] },
                            { prompt: 'What is one example of a new business model in the real estate world?', choices: [
                                'Online platforms for buying and selling homes',
                                'Selling houses door-to-door',
                                'Using only paper ads',
                                'Only meeting clients at coffee shops'
                            ] },
                            { prompt: 'Why is having strong real estate knowledge important?', choices: [
                                'To look smart at parties',
                                'To help clients better and make good decisions',
                                'To win prizes',
                                'To avoid talking to people'
                            ] }
                        ],
                        'law-of-the-shareholder': [
                            { prompt: 'What are two key areas of knowledge that every real estate professional should focus on?', choices: [
                                'Fashion and food',
                                'Property laws and market trends',
                                'Social media and sports',
                                'Furniture styles and car models'
                            ] },
                            { prompt: 'What is the purpose of having a real estate strategy?', choices: [
                                'To work less',
                                'To have fun with friends',
                                'To reach goals and grow your business',
                                'To avoid making phone calls'
                            ] },
                            { prompt: 'Give one example of good execution in real estate.', choices: [
                                'Forgetting appointments',
                                'Listing a home properly and closing a deal',
                                'Taking long breaks',
                                'Only checking emails'
                            ] }
                        ],
                        'm-h-s': [
                            { prompt: 'What happens if you have knowledge and strategy but poor execution?', choices: [
                                'Everything still works',
                                'You get lucky',
                                'You may still fail or lose clients',
                                'You become more famous'
                            ] },
                            { prompt: 'What does "massive transformation" in real estate refer to?', choices: [
                                'Changing a house’s paint color',
                                'Big changes in how real estate works',
                                'Buying more snacks for open houses',
                                'Moving to a new office'
                            ] },
                            { prompt: 'How has consumer behavior changed in modern real estate?', choices: [
                                'People buy homes without looking',
                                'People now search online and expect fast service',
                                'People don’t care about houses anymore',
                                'People only talk to banks'
                            ] }
                        ],
                        'develop-your-kse': [
                            { prompt: 'Why is having strong real estate knowledge important?', choices: [
                                'To look smart at parties',
                                'To help clients better and make good decisions',
                                'To win prizes',
                                'To avoid talking to people'
                            ] },
                            { prompt: 'What are two key areas of knowledge that every real estate professional should focus on?', choices: [
                                'Fashion and food',
                                'Property laws and market trends',
                                'Social media and sports',
                                'Furniture styles and car models'
                            ] },
                            { prompt: 'What is the purpose of having a real estate strategy?', choices: [
                                'To work less',
                                'To have fun with friends',
                                'To reach goals and grow your business',
                                'To avoid making phone calls'
                            ] }
                        ],
                    // Example for another video (add more as needed)
                    // 'law-of-the-iceberg': [ ... ],
                    // 'law-of-the-summit': [ ... ],
                    // ...
                    // Module 14: Phone Sales Mastery (32 videos)
                    'u-c-t-a': [
                        { prompt: '1. What does U.C.T.A. stand for in phone sales?', choices: [
                            'Understand, Connect, Take Action',
                            'Uncover, Clarify, Take Action',
                            'Understand, Clarify, Take Action',
                            'Unite, Communicate, Take Action'
                        ] },
                        { prompt: '2. Why is it important to clarify the client’s needs during a call?', choices: [
                            'To fill time on the call',
                            'To make the client feel important',
                            'To ensure you are solving the right problem',
                            'To avoid talking about price'
                        ] },
                        { prompt: '3. What is the final step in the U.C.T.A. process?', choices: [
                            'Take Action',
                            'Thank the client',
                            'Transfer the call',
                            'Talk about yourself'
                        ] }
                    ],
                    'closer-method': [
                        { prompt: '1. What is the main goal of the Closer Method?', choices: [
                            'To end the call quickly',
                            'To guide the client to a decision',
                            'To talk as much as possible',
                            'To avoid objections'
                        ] },
                        { prompt: '2. Which of the following is a key part of the Closer Method?', choices: [
                            'Listening actively',
                            'Interrupting often',
                            'Focusing only on price',
                            'Using technical jargon'
                        ] },
                        { prompt: '3. Why is it important to handle objections confidently?', choices: [
                            'It shows you are defensive',
                            'It builds trust and moves the sale forward',
                            'It ends the conversation',
                            'It confuses the client'
                        ] }
                    ],
                    'it-s-not-what-you-say': [
                        { prompt: '1. What matters more than the words you say on a sales call?', choices: [
                            'Your tone and delivery',
                            'The length of the call',
                            'The script you use',
                            'The time of day'
                        ] },
                        { prompt: '2. Why is listening important in phone sales?', choices: [
                            'It helps you control the conversation',
                            'It allows you to understand the client’s true needs',
                            'It fills silence',
                            'It shortens the call'
                        ] },
                        { prompt: '3. What is a common mistake salespeople make on the phone?', choices: [
                            'Talking too much and not listening',
                            'Taking notes',
                            'Asking questions',
                            'Confirming details'
                        ] }
                    ],
                    'first-rule-of-selling': [
                        { prompt: '1. What is the first rule of selling over the phone?', choices: [
                            'Always be closing',
                            'Build rapport and trust',
                            'Talk about yourself',
                            'Focus on price first'
                        ] },
                        { prompt: '2. Why is rapport important in sales?', choices: [
                            'It makes the call longer',
                            'It helps the client feel comfortable and open',
                            'It is required by law',
                            'It guarantees a sale'
                        ] },
                        { prompt: '3. What should you avoid when building rapport?', choices: [
                            'Asking questions',
                            'Listening actively',
                            'Being insincere or fake',
                            'Finding common ground'
                        ] }
                    ],
                    'the-agreement-challenge': [
                        { prompt: '1. What is the purpose of the Agreement Challenge in phone sales?', choices: [
                            'To create conflict',
                            'To get the client to say “yes” to small things',
                            'To end the call quickly',
                            'To avoid objections'
                        ] },
                        { prompt: '2. How can you use agreement to move a sale forward?', choices: [
                            'By arguing with the client',
                            'By getting agreement on small points',
                            'By ignoring their concerns',
                            'By talking over them'
                        ] },
                        { prompt: '3. What is a benefit of getting small agreements during a call?', choices: [
                            'It builds momentum toward a bigger “yes”',
                            'It wastes time',
                            'It confuses the client',
                            'It makes the call longer'
                        ] }
                    ],
                    'always-set-the-intention': [
                        { prompt: '1. Why should you always set the intention at the start of a sales call?', choices: [
                            'To control the conversation and set expectations',
                            'To make the call longer',
                            'To avoid questions',
                            'To talk about yourself'
                        ] },
                        { prompt: '2. What is a good way to set the intention?', choices: [
                            'State the purpose of the call clearly',
                            'Ask about the weather',
                            'Jump straight to the pitch',
                            'Wait for the client to ask questions'
                        ] },
                        { prompt: '3. What happens if you don’t set an intention?', choices: [
                            'The call may lack direction and focus',
                            'The client will always buy',
                            'You will save time',
                            'It guarantees a sale'
                        ] }
                    ],
                    'never-lower-yourself-to-the-client': [
                        { prompt: '1. What does it mean to “never lower yourself to the client” in sales?', choices: [
                            'Maintain professionalism and confidence',
                            'Be arrogant',
                            'Ignore the client',
                            'Talk down to the client'
                        ] },
                        { prompt: '2. Why is confidence important in phone sales?', choices: [
                            'It helps you control the conversation',
                            'It builds trust and credibility',
                            'It makes you seem unapproachable',
                            'It shortens the call'
                        ] },
                        { prompt: '3. What should you avoid when maintaining professionalism?', choices: [
                            'Being respectful',
                            'Being defensive or argumentative',
                            'Listening actively',
                            'Staying calm'
                        ] }
                    ],
                    'create-good-hook-question': [
                        { prompt: '1. What is a “hook question” in phone sales?', choices: [
                            'A question that grabs the client’s attention',
                            'A question about fishing',
                            'A question with only yes/no answers',
                            'A question that ends the call'
                        ] },
                        { prompt: '2. Why are hook questions effective?', choices: [
                            'They make the client think and engage',
                            'They confuse the client',
                            'They end the call quickly',
                            'They are required by law'
                        ] },
                        { prompt: '3. When should you use a hook question?', choices: [
                            'At the start of the call to spark interest',
                            'At the end of the call',
                            'Only in emails',
                            'Never'
                        ] }
                    ],
                    'ensure-you-are-audible': [
                        { prompt: '1. Why is it important to ensure you are audible on a sales call?', choices: [
                            'So the client can understand you clearly',
                            'To fill silence',
                            'To make the call longer',
                            'To avoid questions'
                        ] },
                        { prompt: '2. What can affect your audibility on the phone?', choices: [
                            'Background noise and poor connection',
                            'The client’s mood',
                            'The time of day',
                            'The price of the product'
                        ] },
                        { prompt: '3. What should you do if the client says they can’t hear you?', choices: [
                            'Speak louder or move to a quieter place',
                            'End the call',
                            'Ignore them',
                            'Talk faster'
                        ] }
                    ],
                    'actively-listen': [
                        { prompt: '1. What does it mean to “actively listen” on a sales call?', choices: [
                            'Paying close attention and responding appropriately',
                            'Waiting for your turn to talk',
                            'Interrupting the client',
                            'Taking notes only'
                        ] },
                        { prompt: '2. Why is active listening important?', choices: [
                            'It helps you understand the client’s needs',
                            'It makes the call longer',
                            'It guarantees a sale',
                            'It is required by law'
                        ] },
                        { prompt: '3. What is a sign of active listening?', choices: [
                            'Asking follow-up questions',
                            'Changing the subject',
                            'Talking over the client',
                            'Ignoring objections'
                        ] }
                    ],
                    'do-not-interrupt': [
                        { prompt: '1. Why should you avoid interrupting the client on a call?', choices: [
                            'It shows respect and allows them to share their thoughts',
                            'It shortens the call',
                            'It guarantees a sale',
                            'It is required by law'
                        ] },
                        { prompt: '2. What can happen if you interrupt the client?', choices: [
                            'They may feel unheard and frustrated',
                            'They will buy faster',
                            'They will ask more questions',
                            'They will trust you more'
                        ] },
                        { prompt: '3. What is a good practice to avoid interrupting?', choices: [
                            'Wait for the client to finish speaking before responding',
                            'Talk over them',
                            'Change the subject',
                            'End the call quickly'
                        ] }
                    ],
                    'avoid-verbal-diarrhea': [
                        { prompt: '1. What does “avoid verbal diarrhea” mean in phone sales?', choices: [
                            'Don’t talk excessively without purpose',
                            'Talk as much as possible',
                            'Repeat yourself often',
                            'Use technical jargon'
                        ] },
                        { prompt: '2. Why is it important to avoid talking too much?', choices: [
                            'It allows the client to share their needs',
                            'It fills silence',
                            'It guarantees a sale',
                            'It is required by law'
                        ] },
                        { prompt: '3. What is a sign you are talking too much on a call?', choices: [
                            'The client is silent or disengaged',
                            'The client is asking questions',
                            'The call is short',
                            'You are taking notes'
                        ] }
                    ],
                    'stick-to-the-skeleton': [
                        { prompt: '1. What does “stick to the skeleton” mean in phone sales?', choices: [
                            'Follow a clear structure or outline',
                            'Talk about anything',
                            'Change topics often',
                            'Focus only on price'
                        ] },
                        { prompt: '2. Why is having a structure important?', choices: [
                            'It keeps the call focused and effective',
                            'It makes the call longer',
                            'It guarantees a sale',
                            'It is required by law'
                        ] },
                        { prompt: '3. What should you avoid when following a structure?', choices: [
                            'Skipping important steps',
                            'Sticking to the plan',
                            'Listening to the client',
                            'Asking questions'
                        ] }
                    ],
                    'go-back-to-your-intention': [
                        { prompt: '1. Why should you go back to your intention during a call?', choices: [
                            'To stay focused and on track',
                            'To make the call longer',
                            'To avoid questions',
                            'To talk about yourself'
                        ] },
                        { prompt: '2. What is a sign you need to refocus on your intention?', choices: [
                            'The conversation is off-topic',
                            'The client is engaged',
                            'You are closing the sale',
                            'You are asking questions'
                        ] },
                        { prompt: '3. What is a good way to bring the call back on track?', choices: [
                            'Restate the purpose or next step',
                            'Change the subject',
                            'Talk faster',
                            'End the call'
                        ] }
                    ],
                    'avoid-using-jargon': [
                        { prompt: '1. Why should you avoid using jargon in phone sales?', choices: [
                            'It can confuse the client',
                            'It makes you sound smart',
                            'It shortens the call',
                            'It guarantees a sale'
                        ] },
                        { prompt: '2. What is a better alternative to jargon?', choices: [
                            'Use simple, clear language',
                            'Use technical terms',
                            'Talk faster',
                            'Change the subject'
                        ] },
                        { prompt: '3. When is it okay to use jargon?', choices: [
                            'Only if the client understands it',
                            'Always',
                            'Never',
                            'When you want to impress'
                        ] }
                    ],
                    'get-back-on-the-phone': [
                        { prompt: '1. What does “get back on the phone” mean in sales?', choices: [
                            'Keep making calls even after rejection',
                            'Take long breaks',
                            'Wait for clients to call you',
                            'Only call once a week'
                        ] },
                        { prompt: '2. Why is persistence important in phone sales?', choices: [
                            'It increases your chances of success',
                            'It annoys clients',
                            'It shortens the call',
                            'It guarantees a sale'
                        ] },
                        { prompt: '3. What should you do after a tough call?', choices: [
                            'Reflect, learn, and make the next call',
                            'Stop calling for the day',
                            'Complain to your manager',
                            'Change your script'
                        ] }
                    ],
                    'natural-dialogue': [
                        { prompt: '1. What is “natural dialogue” in phone sales?', choices: [
                            'Conversing in a relaxed, authentic way',
                            'Reading a script word-for-word',
                            'Talking only about the product',
                            'Avoiding questions'
                        ] },
                        { prompt: '2. Why is natural dialogue effective?', choices: [
                            'It builds rapport and trust',
                            'It shortens the call',
                            'It guarantees a sale',
                            'It is required by law'
                        ] },
                        { prompt: '3. What should you avoid in natural dialogue?', choices: [
                            'Sounding robotic or rehearsed',
                            'Listening actively',
                            'Asking questions',
                            'Being authentic'
                        ] }
                    ],
                    'limit-product-offer': [
                        { prompt: '1. Why should you limit the product offer on a call?', choices: [
                            'To avoid overwhelming the client',
                            'To make the call longer',
                            'To guarantee a sale',
                            'To show you have many options'
                        ] },
                        { prompt: '2. What is a benefit of focusing on one main offer?', choices: [
                            'It makes the decision easier for the client',
                            'It confuses the client',
                            'It shortens the call',
                            'It is required by law'
                        ] },
                        { prompt: '3. What should you avoid when presenting offers?', choices: [
                            'Listing too many options at once',
                            'Focusing on the client’s needs',
                            'Listening actively',
                            'Being clear and concise'
                        ] }
                    ],
                    'value-rich': [
                        { prompt: '1. What does it mean to be “value-rich” in phone sales?', choices: [
                            'Provide useful information and solutions',
                            'Talk about yourself',
                            'Focus only on price',
                            'Make the call longer'
                        ] },
                        { prompt: '2. Why is value important to clients?', choices: [
                            'It helps them make informed decisions',
                            'It shortens the call',
                            'It guarantees a sale',
                            'It is required by law'
                        ] },
                        { prompt: '3. What is a sign you are providing value?', choices: [
                            'The client is engaged and asking questions',
                            'The client is silent',
                            'The call is short',
                            'You are talking a lot'
                        ] }
                    ],
                    'exactly-why-we-need-to-talk': [
                        { prompt: '1. Why should you explain “exactly why we need to talk” on a call?', choices: [
                            'To set clear expectations and purpose',
                            'To make the call longer',
                            'To avoid questions',
                            'To talk about yourself'
                        ] },
                        { prompt: '2. What is a benefit of being direct about the call’s purpose?', choices: [
                            'It builds trust and saves time',
                            'It confuses the client',
                            'It guarantees a sale',
                            'It is required by law'
                        ] },
                        { prompt: '3. What should you avoid when explaining the purpose?', choices: [
                            'Being vague or unclear',
                            'Being direct',
                            'Listening actively',
                            'Asking questions'
                        ] }
                    ],
                    'use-labels-bola-method': [
                        { prompt: '1. What does “use labels” mean in the Bola Method?', choices: [
                            'Assigning names to emotions or situations',
                            'Labeling products',
                            'Talking about yourself',
                            'Avoiding questions'
                        ] },
                        { prompt: '2. Why are labels effective in sales?', choices: [
                            'They help clients feel understood',
                            'They make the call longer',
                            'They guarantee a sale',
                            'They are required by law'
                        ] },
                        { prompt: '3. When should you use labels?', choices: [
                            'When addressing client concerns or emotions',
                            'At the end of the call',
                            'Only in emails',
                            'Never'
                        ] }
                    ],
                    'stand-up-louder-and-prouder': [
                        { prompt: '1. What does it mean to “stand up louder and prouder” on a call?', choices: [
                            'Speak with confidence and energy',
                            'Talk quietly',
                            'Avoid questions',
                            'Make the call longer'
                        ] },
                        { prompt: '2. Why is energy important in phone sales?', choices: [
                            'It keeps the client engaged',
                            'It shortens the call',
                            'It guarantees a sale',
                            'It is required by law'
                        ] },
                        { prompt: '3. What should you avoid when projecting energy?', choices: [
                            'Sounding bored or uninterested',
                            'Being authentic',
                            'Listening actively',
                            'Asking questions'
                        ] }
                    ],
                    'get-emotional': [
                        { prompt: '1. Why is it important to “get emotional” in sales?', choices: [
                            'Emotions drive decisions and build connection',
                            'It makes the call longer',
                            'It guarantees a sale',
                            'It is required by law'
                        ] },
                        { prompt: '2. What is a sign you are connecting emotionally?', choices: [
                            'The client shares personal stories or feelings',
                            'The client is silent',
                            'The call is short',
                            'You are talking a lot'
                        ] },
                        { prompt: '3. What should you avoid when connecting emotionally?', choices: [
                            'Ignoring the client’s feelings',
                            'Listening actively',
                            'Asking questions',
                            'Being authentic'
                        ] }
                    ],
                    'timing-matters': [
                        { prompt: '1. Why does timing matter in phone sales?', choices: [
                            'It affects the client’s receptiveness',
                            'It shortens the call',
                            'It guarantees a sale',
                            'It is required by law'
                        ] },
                        { prompt: '2. What is a good practice for timing your calls?', choices: [
                            'Call when the client is likely available and focused',
                            'Call at random times',
                            'Call late at night',
                            'Call during meals'
                        ] },
                        { prompt: '3. What should you avoid regarding timing?', choices: [
                            'Calling at inconvenient times',
                            'Being respectful of the client’s schedule',
                            'Listening actively',
                            'Asking questions'
                        ] }
                    ],
                    'get-comfortable': [
                        { prompt: '1. Why is it important to “get comfortable” on sales calls?', choices: [
                            'Comfort helps you sound natural and confident',
                            'It shortens the call',
                            'It guarantees a sale',
                            'It is required by law'
                        ] },
                        { prompt: '2. What is a sign you are comfortable on a call?', choices: [
                            'You speak smoothly and confidently',
                            'You are nervous',
                            'You talk too fast',
                            'You avoid questions'
                        ] },
                        { prompt: '3. What should you avoid when trying to get comfortable?', choices: [
                            'Overthinking and being stiff',
                            'Relaxing and being yourself',
                            'Listening actively',
                            'Asking questions'
                        ] }
                    ],
                    'pretend-you-re-looking-at-them': [
                        { prompt: '1. What does it mean to “pretend you’re looking at them” on a call?', choices: [
                            'Visualize the client to improve connection',
                            'Ignore the client',
                            'Talk about yourself',
                            'Make the call longer'
                        ] },
                        { prompt: '2. Why is visualization helpful in phone sales?', choices: [
                            'It helps you sound more engaged and personal',
                            'It shortens the call',
                            'It guarantees a sale',
                            'It is required by law'
                        ] },
                        { prompt: '3. What should you avoid when visualizing?', choices: [
                            'Losing focus on the conversation',
                            'Staying present and attentive',
                            'Listening actively',
                            'Asking questions'
                        ] }
                    ],
                    'it-s-just-a-video-game': [
                        { prompt: '1. What is meant by “it’s just a video game” in sales?', choices: [
                            'Treat calls as practice and don’t fear mistakes',
                            'Play games during calls',
                            'Talk about video games',
                            'Make the call longer'
                        ] },
                        { prompt: '2. Why is a playful mindset helpful?', choices: [
                            'It reduces pressure and improves performance',
                            'It shortens the call',
                            'It guarantees a sale',
                            'It is required by law'
                        ] },
                        { prompt: '3. What should you avoid with a playful mindset?', choices: [
                            'Taking things too seriously and freezing up',
                            'Relaxing and being yourself',
                            'Listening actively',
                            'Asking questions'
                        ] }
                    ],
                    'sw3n': [
                        { prompt: '1. What does SW3N stand for in sales?', choices: [
                            'Some Will, Some Won’t, So What, Next',
                            'Sell With 3 Numbers',
                            'Sales With 3 Needs',
                            'Speak With 3 Names'
                        ] },
                        { prompt: '2. Why is the SW3N mindset important?', choices: [
                            'It helps you move on from rejection quickly',
                            'It guarantees a sale',
                            'It shortens the call',
                            'It is required by law'
                        ] },
                        { prompt: '3. What should you do after a rejection?', choices: [
                            'Move on to the next call',
                            'Stop calling',
                            'Complain to your manager',
                            'Change your script'
                        ] }
                    ],
                    'scientist-mentality': [
                        { prompt: '1. What is a “scientist mentality” in phone sales?', choices: [
                            'Experiment, learn, and improve with each call',
                            'Talk about science',
                            'Make the call longer',
                            'Guarantee a sale'
                        ] },
                        { prompt: '2. Why is experimentation valuable in sales?', choices: [
                            'It helps you find what works best',
                            'It shortens the call',
                            'It guarantees a sale',
                            'It is required by law'
                        ] },
                        { prompt: '3. What should you avoid with a scientist mentality?', choices: [
                            'Repeating mistakes without learning',
                            'Trying new things',
                            'Listening actively',
                            'Asking questions'
                        ] }
                    ],
                    'text-before-and-after': [
                        { prompt: '1. Why should you text before and after a sales call?', choices: [
                            'To set expectations and follow up',
                            'To make the call longer',
                            'To avoid questions',
                            'To talk about yourself'
                        ] },
                        { prompt: '2. What is a benefit of texting before a call?', choices: [
                            'It prepares the client and increases answer rates',
                            'It shortens the call',
                            'It guarantees a sale',
                            'It is required by law'
                        ] },
                        { prompt: '3. What should you avoid when texting clients?', choices: [
                            'Being unclear or unprofessional',
                            'Being direct',
                            'Listening actively',
                            'Asking questions'
                        ] }
                    ],
                    'always-record': [
                        { prompt: '1. Why is it important to always record your sales calls?', choices: [
                            'To review and improve your performance',
                            'To make the call longer',
                            'To avoid questions',
                            'To talk about yourself'
                        ] },
                        { prompt: '2. What is a benefit of reviewing call recordings?', choices: [
                            'You can identify strengths and areas for improvement',
                            'It shortens the call',
                            'It guarantees a sale',
                            'It is required by law'
                        ] },
                        { prompt: '3. What should you avoid when recording calls?', choices: [
                            'Sharing recordings without permission',
                            'Listening actively',
                            'Asking questions',
                            'Being direct'
                        ] }
                    ],
                    'get-them-to-connect-on-facebook': [
                        { prompt: '1. Why should you get clients to connect on Facebook?', choices: [
                            'It builds a stronger relationship and trust',
                            'It shortens the call',
                            'It guarantees a sale',
                            'It is required by law'
                        ] },
                        { prompt: '2. What is a benefit of connecting on social media?', choices: [
                            'You can stay top of mind and follow up easily',
                            'It makes the call longer',
                            'It guarantees a sale',
                            'It is required by law'
                        ] },
                        { prompt: '3. What should you avoid when connecting on Facebook?', choices: [
                            'Being unprofessional or too personal',
                            'Being authentic',
                            'Listening actively',
                            'Asking questions'
                        ] }
                    ],
                    // Module 15: Face to Face Strategies (10 videos)
                    'beta_video_154_done': [
                        { prompt: '1. What does “Best Known Beats Best” mean in real estate?', choices: [
                            'People choose the agent they see and remember',
                            'Only the most experienced agent wins',
                            'The cheapest agent is the best',
                            'Clients always do research before choosing'
                        ] },
                        { prompt: '2. What is one easy way to become better known in your market?', choices: [
                            'Post helpful content on social media',
                            'Stay completely silent online',
                            'Avoid networking',
                            'Only talk to friends'
                        ] },
                        { prompt: '3. Why is showing your face in marketing important?', choices: [
                            'People connect with real people',
                            'It\'s not helpful',
                            'It distracts clients',
                            'It’s unprofessional'
                        ] }
                    ],
                    'beta_video_155_done': [
                        { prompt: '1. What does it mean when we say “everything is a funnel” in real estate?', choices: [
                            'Every interaction can lead someone closer to working with you',
                            'Only social media is part of your business',
                            'Funnels are only for websites',
                            'You should push people to buy right away'
                        ] },
                        { prompt: '2. What is the first step of a real estate funnel?', choices: [
                            'Closing the deal',
                            'Getting a signature',
                            'Creating awareness and interest',
                            'Making them sign up right away'
                        ] },
                        { prompt: '3. If someone doesn’t respond right away, what should you do?', choices: [
                            'Give up',
                            'Delete their number',
                            'Keep them in your funnel with gentle follow-up',
                            'Complain about it'
                        ] }
                    ],
                    'beta_video_156_done': [
                        { prompt: '1. What does the “Apple Store” approach in real estate focus on?', choices: [
                            'Low prices and fast turnover',
                            'Personal attention and premium service',
                            'Discounts and coupons',
                            'Avoiding all marketing'
                        ] },
                        { prompt: '2. The “Hypermarket” approach in real estate is best described as:', choices: [
                            'Slow, high-end service',
                            'Working with just a few clients',
                            'Fast, high-volume business',
                            'Ignoring follow-ups'
                        ] },
                        { prompt: '3. Why is it important to choose between Apple vs. Hypermarket styles?', choices: [
                            'So you can confuse clients',
                            'To build a clear brand and client experience',
                            'To avoid working altogether',
                            'It doesn’t really matter'
                        ] }
                    ],
                    'beta_video_157_done': [
                        { prompt: '1. Why is “smell” important in real estate showings?', choices: [
                            'It helps buyers imagine living there',
                            'It’s not important',
                            'It only matters in luxury homes',
                            'No one notices scent'
                        ] },
                        { prompt: '2. What’s a good scent to use in an open house?', choices: [
                            'Strong bleach',
                            'Vanilla or citrus',
                            'Gasoline',
                            'Nothing at all'
                        ] },
                        { prompt: '3. What does “see” refer to in atmospheric branding?', choices: [
                            'The time of day',
                            'How your branding and space visually look',
                            'How many clients you have',
                            'The size of the house'
                        ] }
                    ],
                    'beta_video_158_done': [
                        { prompt: '1. What is the first step in the STARBACKS ME Method?', choices: [
                            'Closing a deal',
                            'Smiling',
                            'Asking for referrals',
                            'Showing the contract'
                        ] },
                        { prompt: '2. Why is smiling important in real estate?', choices: [
                            'It helps people feel relaxed and safe',
                            'It saves time',
                            'It replaces marketing',
                            'It’s optional'
                        ] },
                        { prompt: '3. When should a real estate agent smile?', choices: [
                            'Only after the deal closes',
                            'Only during open houses',
                            'Before calls, meetings, and showings',
                            'Only when they feel like it'
                        ] }
                    ],
                    'beta_video_159_done': [
                        { prompt: '1. Why is using a client’s name important?', choices: [
                            'It shows you care and pay attention',
                            'It wastes time',
                            'It’s only for friends',
                            'It confuses people'
                        ] },
                        { prompt: '2. How many times should you naturally say a client’s name in a conversation?', choices: [
                            '2-3 times',
                            '10 times every sentence',
                            'Never',
                            'Only once at the end'
                        ] },
                        { prompt: '3. What feeling does hearing their own name give a client?', choices: [
                            'Feeling ignored',
                            'Feeling special and remembered',
                            'Feeling annoyed',
                            'Feeling rushed'
                        ] }
                    ],
                    'beta_video_160_done': [
                        { prompt: '1. What does offering options help your clients feel?', choices: [
                            'Confused',
                            'In control and confident',
                            'Pressured to decide',
                            'Disconnected'
                        ] },
                        { prompt: '2. At Starbucks, asking “Tall, Grande, or Venti?” is an example of:', choices: [
                            'A complicated question',
                            'Giving an ultimatum',
                            'Offering clear choices',
                            'Forcing a sale'
                        ] },
                        { prompt: '3. In real estate, what is a better way to present homes to clients?', choices: [
                            'This is the only home you should see.',
                            'Let’s pick one home and forget the rest.',
                            'Here are two great options based on your needs.',
                            'You have no choice.'
                        ] }
                    ],
                    'beta_video_161_done': [
                        { prompt: '1. What does the “Tribox” method involve?', choices: [
                            'Giving one perfect choice',
                            'Offering three clear options',
                            'Avoiding decisions',
                            'Telling the client what to do'
                        ] },
                        { prompt: '2. Why do most people choose the middle option in a three-choice setup?', choices: [
                            'It feels too risky',
                            'It’s confusing',
                            'It feels balanced and safe',
                            'It’s the cheapest'
                        ] },
                        { prompt: '3. How can real estate agents use the Tribox with sellers?', choices: [
                            'Offer one price and hope it sticks',
                            'Offer three pricing strategies (low, market, high)',
                            'Don’t talk about price',
                            'Let the seller decide blindly'
                        ] }
                    ],
                    'beta_video_162_done': [
                        { prompt: '1. What is the main idea behind “Brand Championing”?', choices: [
                            'Making people memorize your name',
                            'Creating superfans who promote you',
                            'Selling faster than others',
                            'Copying Starbucks’ coffee recipes'
                        ] },
                        { prompt: '2. How does Starbucks turn customers into brand champions?', choices: [
                            'By making every order complicated',
                            'By charging more',
                            'By creating a personal, feel-good experience',
                            'By giving discounts only'
                        ] },
                        { prompt: '3. What’s one simple way to create a WOW moment for a real estate client?', choices: [
                            'Ask them for money again',
                            'Send a generic email',
                            'Give a thoughtful, unexpected gift',
                            'Avoid calling after closing'
                        ] }
                    ],
                    'beta_video_163_done': [
                        { prompt: '1. What does a firm handshake communicate?', choices: [
                            'You’re in a rush',
                            'You want to argue',
                            'Confidence and professionalism',
                            'That you\'re nervous'
                        ] },
                        { prompt: '2. Why is eye contact important when meeting a client?', choices: [
                            'It makes them feel uncomfortable',
                            'It helps them focus on your outfit',
                            'It builds trust and connection',
                            'It doesn’t really matter'
                        ] },
                        { prompt: '3. What does a warm, natural smile do?', choices: [
                            'Confuses the client',
                            'Makes you look silly',
                            'Shows approachability and friendliness',
                            'Makes the meeting longer'
                        ] }
                    ],
                    // Module 16: Advanced Discovery & Lead Handling (8 videos)
                    'beta_video_165_done': [
                        { prompt: '1. What does “Funnel Down” mean in real estate conversations?', choices: [
                            'Talking about everything at once',
                            'Narrowing the conversation to discover the client’s real needs',
                            'Only working with luxury clients',
                            'Avoiding questions'
                        ] },
                        { prompt: '2. What is the risk of keeping the conversation too broad?', choices: [
                            'You sound more confident',
                            'Clients take faster action',
                            'The client and agent stay stuck in uncertainty',
                            'It helps you sell faster'
                        ] },
                        { prompt: '3. Which of the following is a good “Funnel Down” question?', choices: [
                            '“Do you want to buy or sell?”',
                            '“What brought moving to mind in the first place?”',
                            '“Have you seen the latest interest rates?”',
                            '“Want to see everything on the market?”'
                        ] }
                    ],
                    'beta_video_166_done': [
                        { prompt: '1. What is a “quality lead” in real estate?', choices: [
                            'Someone who ignores your messages',
                            'Someone who is just curious',
                            'Someone who is serious, ready, and willing to communicate',
                            'Someone who likes your Instagram post'
                        ] },
                        { prompt: '2. Why should you focus on quality leads?', choices: [
                            'It’s more fun',
                            'You’ll get more likes online',
                            'It saves time and leads to better results',
                            'You don’t have to follow up'
                        ] },
                        { prompt: '3. Which of the following is a sign of a quality lead?', choices: [
                            'They say “maybe in a year”',
                            'They ask questions and share their timeline',
                            'They don’t return your call',
                            'They just want listings'
                        ] }
                    ],
                    'beta_video_167_done': [
                        { prompt: '1. What is the purpose of disqualifying a lead?', choices: [
                            'To avoid all communication',
                            'To protect your time and focus on serious clients',
                            'To offend people',
                            'To work for free'
                        ] },
                        { prompt: '2. Which of these is a sign you should disqualify a lead?', choices: [
                            'They’re responsive and ready to move',
                            'They ghost after multiple follow-ups',
                            'They provide clear financing information',
                            'They ask smart questions'
                        ] },
                        { prompt: '3. What should you do after disqualifying a lead?', choices: [
                            'Ignore them forever',
                            'Add them to a drip campaign and focus on active clients',
                            'Insist they work with you',
                            'Block their number'
                        ] }
                    ],
                    'beta_video_168_done': [
                        { prompt: '1. What is the main goal of an efficient first discovery call?', choices: [
                            'Chat about your background for 30 minutes',
                            'Quickly uncover client needs and agree on next steps',
                            'Sell the most expensive home immediately',
                            'Talk only about yourself'
                        ] },
                        { prompt: '2. Which step should you take before the discovery call?', choices: [
                            'Show up without preparation',
                            'Send a brief agenda outlining the call’s purpose',
                            'Ask unrelated personal questions',
                            'Ignore the client’s time'
                        ] },
                        { prompt: '3. Which of these is one of the three core questions to ask on the call?', choices: [
                            '“What’s your favorite color?”',
                            '“What’s bringing you to the market at this moment?”',
                            '“Do you like open houses?”',
                            '“How many pets do you have?”'
                        ] }
                    ],
                    'beta_video_169_done': [
                        { prompt: '1. What is the primary goal of an Opening Discovery question?', choices: [
                            'To talk about your services immediately',
                            'To uncover the client’s true needs and build rapport',
                            'To schedule open houses for next month',
                            'To avoid listening'
                        ] },
                        { prompt: '2. Which of these is an example of setting the agenda at the start of a call?', choices: [
                            '“I’ll tell you about my whole career now.”',
                            '“In the next 10 minutes, I’ll ask about your goals, explain how I help, and plan next steps – sound good?”',
                            '“Let me text you later.”',
                            '“Do you like dogs?”'
                        ] },
                        { prompt: '3. Which question is a powerful opener for discovery?', choices: [
                            '“What inspired you to start this search today?”',
                            '“Did you see the latest listings?”',
                            '“Want to go see a house?”',
                            '“How’s the weather?”'
                        ] }
                    ],
                    'beta_video_170_done': [
                        { prompt: '1. What does “pre-handle objections” mean?', choices: [
                            'Waiting for clients to ask questions',
                            'Anticipating and addressing concerns before they arise',
                            'Ignoring client worries',
                            'Only handling objections after closing'
                        ] },
                        { prompt: '2. Why is it helpful to pre-handle price objections?', choices: [
                            'It confuses clients',
                            'It shows you’ve thought through their concerns and builds trust',
                            'It delays the sale',
                            'It makes the price seem higher'
                        ] },
                        { prompt: '3. Which is an example of a pre-handle statement for home condition?', choices: [
                            '“This floor is old but the seller offers a repair credit.”',
                            '“You decide if you like it.”',
                            '“Let’s skip talking about it.”',
                            '“I don’t know about the flooring.”'
                        ] }
                    ],
                    'beta_video_171_done': [
                        { prompt: '1. Why is it important to find the decision maker?', choices: [
                            'To make small talk',
                            'To avoid wasting time with gatekeepers',
                            'To discuss décor choices only',
                            'To meet more people'
                        ] },
                        { prompt: '2. Which question helps identify other decision makers?', choices: [
                            '“What’s your favorite color?”',
                            '“Who else will be involved in this decision?”',
                            '“Do you like real estate?”',
                            '“Want to grab coffee?”'
                        ] },
                        { prompt: '3. If a client says, “I’ll need to check with my partner,” what does that tell you?', choices: [
                            'You should ignore them',
                            'Their partner is a decision maker',
                            'They don’t want your help',
                            'They love your service'
                        ] }
                    ],
                    'beta_video_172_done': [
                        { prompt: '1. What is the primary goal when you “lead toward the next step”?', choices: [
                            'Provide endless options',
                            'Guide the client to a clear action',
                            'Talk about your experience',
                            'Wait for the client to decide on their own'
                        ] },
                        { prompt: '2. Which of these is an example of offering two clear options?', choices: [
                            '“Let me know when you’re free.”',
                            '“Would you prefer a morning or afternoon showing?”',
                            '“Tell me any time that works.”',
                            '“I’ll show you everything.”'
                        ] },
                        { prompt: '3. Why is setting a timeframe important?', choices: [
                            'To confuse the client',
                            'To create urgency and clarity',
                            'To avoid follow-up',
                            'To talk about other topics'
                        ] }
                    ],
                    //Module 17 (18 videos)
                    'a-great-attitude-is-worth-more-than-a-great-product': [
                        { prompt: '1. Why is a great attitude important in real estate?', choices: [
                            'Because clients only care about square footage',
                            'Because attitude builds trust and connection',
                            'Because homes sell themselves',
                            'Because it saves time'
                        ] },
                        { prompt: '2. If something goes wrong during a showing, what’s the best response?', choices: [
                            'Blame the seller',
                            'Get frustrated',
                            'Stay positive and find a solution',
                            'Cancel the appointment'
                        ] },
                        { prompt: '3. How can you show a great attitude over the phone?', choices: [
                            'Speak in a serious tone',
                            'Read a script quickly',
                            'Smile while you talk',
                            'Talk about your stress'
                        ] }
                    ],
                    'treat-them-like-millionaires': [
                        { prompt: '1. Why should you treat every client like a millionaire?', choices: [
                            'Only millionaires buy homes',
                            'To impress your boss',
                            'Because every client deserves respect and value',
                            'To shorten your workday'
                        ] },
                        { prompt: '2. Who should receive top-tier service?', choices: [
                            'Only luxury buyers',
                            'People you already know',
                            'Every client, no matter their price range',
                            'Clients who dress fancy'
                        ] },
                        { prompt: '3. What’s a powerful mindset shift from this module?', choices: [
                            '“I only work with serious investors.”',
                            '“I give my best to big commissions.”',
                            '“Everyone gets VIP treatment, no matter what.”',
                            '“Renters aren’t worth my time.”'
                        ] }
                    ],
                    'have-a-killer-instinct': [
                        { prompt: '1. What does having a “killer instinct” in real estate mean?', choices: [
                            'Being rude to get what you want',
                            'Waiting for leads to call you',
                            'Taking decisive, confident action to win',
                            'Ignoring your competition'
                        ] },
                        { prompt: '2. Which of the following best shows killer instinct?', choices: [
                            'Giving up after one follow-up',
                            'Hoping a client will call back',
                            'Proactively following up with value',
                            'Waiting for the client to decide'
                        ] },
                        { prompt: '3. Which mindset matches killer instinct?', choices: [
                            '“I’ll just hope for the best.”',
                            '“I’m going to create my own success.”',
                            '“Maybe this isn’t for me.”',
                            '“Let’s see what happens.”'
                        ] }
                    ],
                    'a-product-of-your-environment': [
                        { prompt: '1. What does “you are a product of your environment” mean?', choices: [
                            'Your success depends only on luck',
                            'Your surroundings and influences shape your behavior and results',
                            'You must work in a fancy office',
                            'It only applies to new agents'
                        ] },
                        { prompt: '2. Which type of environment helps a real estate agent grow?', choices: [
                            'One filled with negativity and gossip',
                            'A group that never makes calls',
                            'A culture of learning, support, and motivation',
                            'A team that blames the market'
                        ] },
                        { prompt: '3. What should you do if your environment is bringing you down?', choices: [
                            'Stay silent and wait for change',
                            'Lower your goals to match others',
                            'Change your mindset and consider shifting rooms or teams',
                            'Stop working as hard'
                        ] }
                    ],
                    'the-magic-of-give-give-give': [
                        { prompt: '1. What is the main idea behind the "Give, Give, Give" approach in real estate?', choices: [
                            'Sell properties fast',
                            'Focus on making commissions',
                            'Lead with value and help others first',
                            'Talk about yourself more'
                        ] },
                        { prompt: '2. Which of the following is an example of "giving" in real estate?', choices: [
                            'Pressuring someone to sign a deal',
                            'Ignoring clients after hours',
                            'Offering a free market report',
                            'Only working with qualified buyers'
                        ] },
                        { prompt: '3. Why does giving help in the long run?', choices: [
                            'People love free stuff',
                            'You build trust and become top-of-mind',
                            'It guarantees fast sales',
                            'It looks good on social media'
                        ] }
                    ],
                    'make-service-senior-to-selling': [
                        { prompt: '1. Why is it important to prioritize service over selling in real estate?', choices: [
                            'To close deals faster',
                            'To build trust and long-term relationships',
                            'To avoid talking to clients',
                            'To increase paperwork'
                        ] },
                        { prompt: '2. What should a real estate agent do first when working with a client?', choices: [
                            'Show them the most expensive homes',
                            'Listen carefully to understand their needs',
                            'Push for a quick sale',
                            'Send contracts immediately'
                        ] },
                        { prompt: '3. What is a good way to stand out in a crowded real estate market?', choices: [
                            'Prioritize commissions above all',
                            'Make service the main focus',
                            'Avoid following up with clients',
                            'Rush clients to decide'
                        ] }
                    ],
                    'it-s-never-about-the-price': [
                        { prompt: '1. What usually drives a buyer or seller’s decision more than price?', choices: [
                            'Fear, emotions, and trust',
                            'The weather',
                            'The size of the contract',
                            'How fast the agent talks'
                        ] },
                        { prompt: '2. What is a better approach than debating price?', choices: [
                            'Talk louder than the client',
                            'Drop the price quickly',
                            'Stay curious and ask better questions',
                            'Show off expensive clothes'
                        ] },
                        { prompt: '3. What should an agent focus on instead of just numbers?', choices: [
                            'Listing as many homes as possible',
                            'The emotional and lifestyle value of the property',
                            'Arguing with the client',
                            'Ignoring the client\'s concerns'
                        ] }
                    ],
                    'the-10x-rule-part-1': [
                        { prompt: '1. What does the 10X Rule teach you to do?', choices: [
                            'Do just enough to get by',
                            'Set goals 10 times bigger and take 10 times more action',
                            'Work slower but smarter',
                            'Avoid taking risks'
                        ] },
                        { prompt: '2. Why is the 10X Rule effective in real estate?', choices: [
                            'It makes your logo look cooler',
                            'It reduces your workload',
                            'It helps you stand out and get bigger results',
                            'It avoids dealing with people'
                        ] },
                        { prompt: '3. According to the 10X Rule, what should you do when things get tough?', choices: [
                            'Give up',
                            'Slow down and wait',
                            'Push harder and take even more action',
                            'Change careers'
                        ] }
                    ],
                    'the-10x-rule-part-2': [
                        { prompt: '1. What is the main idea of the 10X Rule?', choices: [
                            'Do just enough to stay consistent',
                            'Work smarter, not harder',
                            'Take massive action, 10 times more than average',
                            'Wait for the perfect opportunity'
                        ] },
                        { prompt: '2. Which of the following is a 10X action?', choices: [
                            'Hosting one open house a year',
                            'Hosting multiple open houses per month and following up personally',
                            'Hoping people show up without promotion',
                            'Avoiding open houses because they\'re tiring'
                        ] },
                        { prompt: '3. What does a 10X mindset sound like?', choices: [
                            '“I\'ll try my best and see what happens.”',
                            '“If it\'s slow, I\'ll just wait.”',
                            '“Hopefully one lead comes through.”',
                            '“If success takes 10X more, I\'ll do 10X more.”'
                        ] }
                    ],
                    'boba': [
                        { prompt: '1. According to the video, what does "BOBA" stand for?', choices: [
                            'Be Outstanding, Be Ambitious',
                            'Be Obsessed or Be Average',
                            'Build Opportunities, Build Achievements',
                            'Be Original, Be Authentic'
                        ] },
                        { prompt: '2. According to the video, what is the main reason why most people stay stuck?', choices: [
                            'They don\'t have enough money to start',
                            'They lack the right connections and network',
                            'They are too afraid of what others think',
                            'They are not obsessed with the action they need to take'
                        ] },
                        { prompt: '3. Which of the following best describes the two choices presented in the video\'s core philosophy?', choices: [
                            'Work smart or work hard',
                            'Be disciplined or be lazy',
                            'Take risks or play it safe',
                            'Be obsessed or remain average'
                        ] }
                    ],
                    'success-is-your-duty': [
                        { prompt: '1. What does it mean when we say "success is your duty" in real estate?', choices: [
                            'Success is a lucky break',
                            'Success is something to hope for',
                            'Success is a personal responsibility',
                            'Success doesn\'t matter'
                        ] },
                        { prompt: '2. What\'s one way to treat your real estate career seriously?', choices: [
                            'Work when you feel like it',
                            'Wait for leads to come in',
                            'Show up every day with a plan',
                            'Only work when it\'s busy'
                        ] },
                        { prompt: '3. What mindset supports success as a duty?', choices: [
                            '“I\'ll try when I can.”',
                            '“I take ownership of my business.”',
                            '“I just follow the market.”',
                            '“It\'s not my fault.”'
                        ] }
                    ],
                    'no-shortage-here': [
                        { prompt: '1. What mindset does the phrase "No Shortage Here" represent?', choices: [
                            'Scarcity',
                            'Confusion',
                            'Abundance',
                            'Indifference'
                        ] },
                        { prompt: '2. What does an agent with an abundance mindset do?', choices: [
                            'Waits quietly for clients to appear',
                            'Panics when the phone is silent',
                            'Reaches out and builds connections',
                            'Gives up easily'
                        ] },
                        { prompt: '3. Which of the following supports the idea of "No Shortage Here"?', choices: [
                            '“The market is dry.”',
                            '“I\'ll never find a client.”',
                            '“The right people are out there — I just need to find them.”',
                            '“Maybe next year will be better.”'
                        ] }
                    ],
                    'control-freak': [
                        { prompt: '1. What is one thing a real estate agent can control?', choices: [
                            'A client\'s decision',
                            'The housing market',
                            'Their daily actions and follow-up',
                            'How fast a house sells'
                        ] },
                        { prompt: '2. What is the risk of trying to control everything in real estate?', choices: [
                            'Better marketing',
                            'Team growth',
                            'Burnout and frustration',
                            'More referrals'
                        ] },
                        { prompt: '3. What should a control-focused agent start doing instead?', choices: [
                            'Micromanage their assistant',
                            'Focus on trust and systems',
                            'Ignore the process',
                            'Avoid client calls'
                        ] }
                    ],
                    '4-degrees-of-action': [
                        { prompt: '1. What is the highest and most effective level of action in real estate?', choices: [
                            'No action',
                            'Retreat of action',
                            'Average action',
                            'Massive action'
                        ] },
                        { prompt: '2. What do most real estate agents settle for?', choices: [
                            'No action',
                            'Massive action',
                            'Retreat of action',
                            'Average action'
                        ] },
                        { prompt: '3. What is a key trait of an agent taking massive action?', choices: [
                            'Waiting for motivation',
                            'Making excuses',
                            'Taking consistent and bold steps daily',
                            'Doing the bare minimum'
                        ] }
                    ],
                    'competition-is-for-losers': [
                        { prompt: '1. Why is competition considered a losing mindset?', choices: [
                            'It makes you richer',
                            'It distracts you from creating your own path',
                            'It helps you win faster',
                            'It improves your listings instantly'
                        ] },
                        { prompt: '2. What\'s a better alternative to competing in real estate?', choices: [
                            'Doing nothing',
                            'Blaming the market',
                            'Creating something unique clients value',
                            'Copying the top agent\'s Instagram'
                        ] },
                        { prompt: '3. What\'s the mindset shift promoted in this module?', choices: [
                            'Chase the top producer',
                            'Compete hard and win',
                            'Beat others at their own game',
                            'Focus on creation, not competition'
                        ] }
                    ],
                    'overcommit': [
                        { prompt: '1. What does overcommitting mean?', choices: [
                            'Taking on more tasks than you can handle well',
                            'Saying no to clients',
                            'Working fewer hours',
                            'Only helping one client at a time'
                        ] },
                        { prompt: '2. What is a risk of overcommitting?', choices: [
                            'Increased free time',
                            'Burnout and missed deadlines',
                            'Better client service',
                            'More referrals'
                        ] },
                        { prompt: '3. Which is a good way to avoid overcommitting?', choices: [
                            'Say yes to everything',
                            'Set realistic expectations with clients',
                            'Ignore your schedule',
                            'Take on every showing available'
                        ] }
                    ],
                    'expand-never-contract': [
                        { prompt: '1. What does "Expand Never Contract" mean?', choices: [
                            'Pull back when things get hard',
                            'Keep growing and trying new things',
                            'Stop learning new skills',
                            'Avoid talking to clients'
                        ] },
                        { prompt: '2. What is a risk of contracting your efforts?', choices: [
                            'Finding new opportunities',
                            'Losing momentum and falling behind',
                            'Growing your business',
                            'Meeting more clients'
                        ] },
                        { prompt: '3. What should you do when facing challenges in your real estate business?', choices: [
                            'Pull back and wait',
                            'Double down and expand your actions',
                            'Stop prospecting',
                            'Avoid new marketing ideas'
                        ] }
                    ],
                    'fear-is-an-indicator': [
                        { prompt: '1. What does fear often indicate in real estate?', choices: [
                            'Danger to avoid',
                            'A chance to grow and learn',
                            'A reason to quit',
                            'A sign to do nothing'
                        ] },
                        { prompt: '2. What should you do when you feel fear about a task like cold calling?', choices: [
                            'Avoid the task completely',
                            'Face it by taking small steps anyway',
                            'Wait for someone else to do it',
                            'Ignore the task forever'
                        ] },
                        { prompt: '3. What is a good first step when dealing with fear?', choices: [
                            'Write down your fear and take one small action to face it',
                            'Ignore your fear completely',
                            'Tell yourself you can never overcome it',
                            'Avoid talking to mentors or peers'
                        ] }
                    ],
                    
                    //module 18 (20 videos)
                    'be-a-cult': [ 
                        { prompt: '1. What does "Be a Cult" mean in real estate?', choices: [
                            'Build a loyal community of clients and supporters',
                            'Ignore your clients after a sale',
                            'Only focus on one deal at a time',
                            'Avoid talking to clients regularly'
                        ] },
                        { prompt: '2. How can you build a loyal "cult" of clients?', choices: [
                            'Only contact clients when you need something',
                            'Consistently add value and stay connected',
                            'Ignore feedback from clients',
                            'Only talk about selling houses'
                        ] },
                        { prompt: '3. Why is building a loyal tribe important?', choices: [
                            'It helps get more referrals and repeat business',
                            'It makes you less busy',
                            'It reduces your workload to zero',
                            'It stops you from meeting new clients'
                        ] }
                    ],
                    'have-one-voice': [
                        { prompt: '1. What does "Have One Voice" mean in real estate?', choices: [
                            'Talking loudly on the phone',
                            'Changing your style to match everyone',
                            'Being consistent in how you communicate',
                            'Using fancy real estate words'
                        ] },
                        { prompt: '2. Why is it important to have one voice?', choices: [
                            'So you sound impressive',
                            'To confuse the competition',
                            'To build trust and recognition with clients',
                            'To talk more about yourself'
                        ] },
                        { prompt: '3. What\'s a good first step to develop your one voice?', choices: [
                            'Use slang to sound friendly',
                            'Define your core message and values',
                            'Speak more formally',
                            'Change your message for each client'
                        ] }
                    ],
                    'know-the-mission-and-vision': [
                        { prompt: '1. What is a mission in real estate?', choices: [
                            'A random goal for the month',
                            'The reason why you do what you do',
                            'A script you say to clients',
                            'A sales target'
                        ] },
                        { prompt: '2. What does your vision represent?', choices: [
                            'How many deals you want next week',
                            'The clients you do not want to work with',
                            'The long-term future you are building',
                            'The last home you sold'
                        ] },
                        { prompt: '3. Why is it important to know your mission and vision?', choices: [
                            'To sound smart in meetings',
                            'To stay focused, motivated, and attract the right clients',
                            'To get more likes on social media',
                            'To win arguments with other agents'
                        ] }
                    ],
                    'embrace-your-values': [
                        { prompt: '1. What does "embracing your value" mean as a real estate agent?', choices: [
                            'Lowering your commission to win clients',
                            'Letting clients lead every decision',
                            'Knowing and confidently communicating what you bring to the table',
                            'Copying what other agents do'
                        ] },
                        { prompt: '2. Why is it important to believe in your own value?', choices: [
                            'So you can get more likes on Instagram',
                            'So people will not ask you questions',
                            'So you attract clients who trust and respect you',
                            'So you never have to explain anything'
                        ] },
                        { prompt: '3. Which of the following is a good example of embracing your value?', choices: [
                            'Apologizing for your fees',
                            'Sharing a story about how you helped a client succeed',
                            'Saying "I am not the best, but I will try"',
                            'Avoiding social media because you do not feel confident'
                        ] }
                    ],
                    'dress-for-success': [
                        { prompt: '1. Why does how you dress matter in real estate?', choices: [
                            'To impress your friends',
                            'Because everyone else is doing it',
                            'It shapes how clients see your professionalism and trustworthiness',
                            'To follow fashion trends'
                        ] },
                        { prompt: '2. What does "Dress for Success" mean for a real estate agent?', choices: [
                            'Wearing whatever is comfortable',
                            'Dressing in a way that reflects your brand and builds confidence',
                            'Wearing expensive designer clothes only',
                            'Wearing casual clothes every day'
                        ] },
                        { prompt: '3. What is one thing your clothing communicates before you speak?', choices: [
                            'Your favorite color',
                            'Your professionalism and attention to detail',
                            'How long you have been in real estate',
                            'What kind of music you like'
                        ] }
                    ],
                    'always-abc': [
                        { prompt: '1. In real estate, what does ABC stand for in this module?', choices: [
                            'Always Be Cold-calling',
                            'Always Build Character',
                            'Always Buy Condos',
                            'Always Be Competing'
                        ] },
                        { prompt: '2. Why is building character important in real estate?', choices: [
                            'So you can win arguments with clients',
                            'It helps build trust, referrals, and long-term success',
                            'It makes your listings go viral',
                            'It guarantees quick closings'
                        ] },
                        { prompt: '3. Which of the following is a sign of strong character?', choices: [
                            'Blaming others when things go wrong',
                            'Taking responsibility and staying honest',
                            'Ignoring client questions',
                            'Making promises you cannot keep'
                        ] }
                    ],
                    'keep-your-haircut-neat': [
                        { prompt: '1. Why is a neat haircut important for real estate agents?', choices: [
                            'To look taller',
                            'To spend less time getting ready',
                            'To make a strong first impression and appear professional',
                            'To match their outfit'
                        ] },
                        { prompt: '2. What does a clean, fresh haircut say about you to clients?', choices: [
                            'You like going to the barber',
                            'You pay attention to detail and take your role seriously',
                            'You follow trends',
                            'You are a fashion expert'
                        ] },
                        { prompt: '3. What is one benefit of keeping your haircut neat?', choices: [
                            'It helps you avoid cold calls',
                            'You feel more confident and look ready for business',
                            'You will get free leads',
                            'Your car will stay clean'
                        ] }
                    ],
                    'smell-good-do-good': [
                        { prompt: '1. Why is it important for real estate agents to smell good?', choices: [
                            'To show off their cologne collection',
                            'Because scent influences how comfortable clients feel',
                            'So people think they are rich',
                            'To get better deals'
                        ] },
                        { prompt: '2. What does a clean, pleasant scent say about you as an agent?', choices: [
                            'You shop at fancy stores',
                            'You care about professionalism and presentation',
                            'You are trying too hard',
                            'You want attention'
                        ] },
                        { prompt: '3. How can smelling good affect your business?', choices: [
                            'It helps you close deals faster',
                            'It makes clients feel comfortable and remember you',
                            'It is only useful for networking events',
                            'It does not really matter'
                        ] }
                    ],
                    'wear-your-brand-with-pride': [
                        { prompt: '1. Why is it important for real estate agents to wear their brand with pride?', choices: [
                            'To copy what other agents are doing',
                            'To show confidence, professionalism, and build trust',
                            'To look trendy',
                            'To avoid doing paperwork'
                        ] },
                        { prompt: '2. What is one way to show pride in your real estate brand?', choices: [
                            'Avoid talking about it',
                            'Change your brand colors often',
                            'Wear branded clothing or use a professional email signature',
                            'Keep your brand a secret'
                        ] },
                        { prompt: '3. What does being consistent with your brand help build?', choices: [
                            'Confusion',
                            'Credibility and trust',
                            'Silence',
                            'More paperwork'
                        ] }
                    ],
                    'foster-a-growth-mindset': [
                        { prompt: '1. What does having a growth mindset mean?', choices: [
                            'Believing your skills can improve with effort',
                            'Thinking you are perfect already',
                            'Avoiding challenges',
                            'Giving up quickly'
                        ] },
                        { prompt: '2. How do agents with a growth mindset handle rejection?', choices: [
                            'They get discouraged and stop trying',
                            'They ignore feedback',
                            'They see it as a chance to learn and improve',
                            'They blame others'
                        ] },
                        { prompt: '3. What should you do after losing a listing or deal?', choices: [
                            'Ignore what happened',
                            'Ask for feedback and find ways to improve',
                            'Complain to others',
                            'Stop trying'
                        ] }
                    ],
                    'promote-team-collaboration': [
                        { prompt: '1. Why is team collaboration important in real estate?', choices: [
                            'To compete against teammates',
                            'To do everything alone',
                            'To multiply strengths and close deals faster',
                            'To avoid communication'
                        ] },
                        { prompt: '2. What can a collaborative team help clients experience?', choices: [
                            'Confusion',
                            'A seamless and supportive process',
                            'Delays',
                            'Lack of communication'
                        ] },
                        { prompt: '3. Who wins when real estate teams collaborate well?', choices: [
                            'Only the team leader',
                            'Only the clients',
                            'The agents, the team, and the clients',
                            'No one'
                        ] }
                    ],
                    'customer-centric-focus': [
                        { prompt: '1. What does a customer-centric focus mean?', choices: [
                            'Focusing only on making sales fast',
                            'Putting the client\'s needs and goals first',
                            'Ignoring client preferences',
                            'Only showing expensive homes'
                        ] },
                        { prompt: '2. Why is listening to your clients important?', choices: [
                            'To sell more quickly',
                            'To understand their unique needs and serve them better',
                            'To convince them to buy anything',
                            'To avoid communication'
                        ] },
                        { prompt: '3. How does a customer-centric mindset help your real estate career?', choices: [
                            'It builds trust and long-term relationships',
                            'It wastes time',
                            'It makes clients unhappy',
                            'It leads to fewer referrals'
                        ] }
                    ],
                    'celebrate-small-wins': [
                        { prompt: '1. Why is it important to celebrate small wins in real estate?', choices: [
                            'It wastes time',
                            'It keeps motivation high and builds confidence',
                            'It makes work harder',
                            'It causes burnout'
                        ] },
                        { prompt: '2. What is an example of a small win for a real estate agent?', choices: [
                            'Booking a listing appointment',
                            'Closing a big sale only',
                            'Ignoring leads',
                            'Complaining about the market'
                        ] },
                        { prompt: '3. How does celebrating small wins help you?', choices: [
                            'It improves resilience and momentum',
                            'It makes you tired',
                            'It stops you from working',
                            'It wastes money'
                        ] }
                    ],
                    'effective-communication-channels': [
                        { prompt: '1. Why is using the right communication channel important in real estate?', choices: [
                            'To confuse clients',
                            'To connect effectively and build trust',
                            'To ignore clients',
                            'To waste time'
                        ] },
                        { prompt: '2. Which communication channel is best for quick updates?', choices: [
                            'Formal letters',
                            'Text messages or instant messaging',
                            'Sending emails only once a month',
                            'Ignoring messages'
                        ] },
                        { prompt: '3. Why is it important to respond promptly to client inquiries?', choices: [
                            'To build reliability and trust',
                            'To waste their time',
                            'To make them wait longer',
                            'To lose their business'
                        ] }
                    ],
                    'think-critically': [
                        { prompt: '1. What does thinking critically mean?', choices: [
                            'Making decisions without facts',
                            'Analyzing information and making reasoned decisions',
                            'Ignoring problems',
                            'Always guessing'
                        ] },
                        { prompt: '2. Why is critical thinking important in real estate?', choices: [
                            'To avoid mistakes and make better decisions',
                            'To rush into deals',
                            'To guess prices',
                            'To ignore market trends'
                        ] },
                        { prompt: '3. What should an agent do before advising clients on pricing?', choices: [
                            'Guess based on feelings',
                            'Review market data and comparable sales',
                            'Price as high as possible without research',
                            'Follow rumors'
                        ] }
                    ],
                    'sales-success-huddle': [
                        { prompt: '1. What is a sales success huddle?', choices: [
                            'A team meeting to share goals and wins',
                            'A time to take a long break',
                            'Ignoring sales challenges',
                            'Working alone without talking'
                        ] },
                        { prompt: '2. How often should sales success huddles be held?', choices: [
                            'Never',
                            'Only once a year',
                            'Daily or weekly',
                            'Every five years'
                        ] },
                        { prompt: '3. What is one benefit of sales success huddles?', choices: [
                            'Builds team motivation and accountability',
                            'Causes confusion',
                            'Makes agents work less',
                            'Leads to arguments'
                        ] }
                    ],
                    'music-and-beats': [
                        { prompt: '1. What does "finding your beat" mean in real estate?', choices: [
                            'Working randomly whenever you feel like it',
                            'Creating a steady rhythm in your daily tasks',
                            'Ignoring your schedule',
                            'Skipping important tasks'
                        ] },
                        { prompt: '2. How can music help a real estate agent?', choices: [
                            'By making work more enjoyable and boosting energy',
                            'By distracting from important tasks',
                            'By stopping communication with clients',
                            'By causing stress'
                        ] },
                        { prompt: '3. Why is having a daily rhythm important in real estate?', choices: [
                            'It helps maintain momentum and focus',
                            'It wastes time',
                            'It makes work harder',
                            'It causes confusion'
                        ] }
                    ],
                    'raffle': [
                        { prompt: '1. What is one main benefit of hosting a raffle in real estate?', choices: [
                            'It scares people away',
                            'It helps collect leads and build relationships',
                            'It wastes time',
                            'It is only for parties'
                        ] },
                        { prompt: '2. When is a good time to run a raffle?', choices: [
                            'During an open house',
                            'At a community event',
                            'On social media',
                            'All of the above'
                        ] },
                        { prompt: '3. How can a raffle help grow your real estate business?', choices: [
                            'By annoying people',
                            'By collecting contact info and offering follow-up value',
                            'By selling things immediately',
                            'By giving away free houses'
                        ] }
                    ],
                    'unity-clap': [
                        { prompt: '1. What is the main purpose of a Unit Clap?', choices: [
                            'To criticize mistakes',
                            'To celebrate wins and build team spirit',
                            'To end meetings faster',
                            'To sell more homes instantly'
                        ] },
                        { prompt: '2. What kinds of wins should be celebrated in a Unit Clap?', choices: [
                            'Only closed deals',
                            'Any progress, effort, or positive action',
                            'Only listings over $1 million',
                            'Just the team leader\'s wins'
                        ] },
                        { prompt: '3. What is one benefit of doing regular Unit Claps?', choices: [
                            'Creates competition',
                            'Builds team connection and energy',
                            'Makes people feel awkward',
                            'Wastes time'
                        ] }
                    ],
                    'celebrate-closed-deals': [
                        { prompt: '1. Why should real estate agents celebrate closed deals?', choices: [
                            'Because it wastes time',
                            'To show off',
                            'To recognize effort and build motivation',
                            'So they do not have to work anymore'
                        ] },
                        { prompt: '2. What\'s one way to celebrate a closed deal?', choices: [
                            'Ignore it and move on',
                            'Ring a bell, treat yourself, or share it on social media',
                            'Keep it a secret',
                            'Only tell your broker'
                        ] },
                        { prompt: '3. Who can benefit from celebrating a closing?', choices: [
                            'Just the buyer',
                            'Only the agent',
                            'Everyone involved, the agent, client, and team',
                            'Only the seller'
                        ] }
                    ],
                    //Module 19 (20 videos)
                    '1-rule-of-follow-up': [
                        { prompt: '1. What is the #1 rule of follow-ups in real estate?', choices: [
                            'Be aggressive and call every day',
                            'Wait for the client to reach out',
                            'Be consistent without being pushy',
                            'Send long emails every week'
                        ] },
                        { prompt: '2. Why is follow-up important in real estate?', choices: [
                            'Clients respond instantly',
                            'Most deals close on the first call',
                            'People forget you if you do not stay in touch',
                            'Only new agents follow up'
                        ] },
                        { prompt: '3. What mindset should agents have when doing follow-ups?', choices: [
                            '“If they do not respond, they are not serious.”',
                            '“They probably do not want to hear from me.”',
                            '“They might not be ready yet, but I can still serve.”',
                            '“I will wait until they contact me again.”'
                        ] }
                    ],
                    'implement-callback-programs': [
                        { prompt: '1. What is the main purpose of a callback program in real estate?', choices: [
                            'To delay responding to clients',
                            'To make cold calls all day',
                            'To follow up with missed calls and inquiries',
                            'To sell products online'
                        ] },
                        { prompt: '2. Why are callbacks important in real estate?', choices: [
                            'Most clients do not want to talk',
                            'Missed calls mean lost opportunities',
                            'Texting is the only thing that works',
                            'Agents should wait to be called again'
                        ] },
                        { prompt: '3. What mindset should agents have about callbacks?', choices: [
                            '“If it is important, they will call again.”',
                            '“Every call is a chance to serve.”',
                            '“Callbacks are a waste of time.”',
                            '“Just send a flyer instead.”'
                        ] }
                    ],
                    'utilize-texts-calls': [
                        { prompt: '1. Why should real estate agents use both texts and calls?', choices: [
                            'To confuse clients',
                            'To make clients answer faster',
                            'To build connection and stay top-of-mind',
                            'To avoid emails'
                        ] },
                        { prompt: '2. When is texting most useful in real estate?', choices: [
                            'For long conversations',
                            'To close deals',
                            'For quick updates or confirmations',
                            'To avoid talking to people'
                        ] },
                        { prompt: '3. What is a great combo strategy for using text and calls?', choices: [
                            'Call only once a month',
                            'Text three times a day',
                            'Text first, then follow up with a call',
                            'Only call during lunch'
                        ] }
                    ],
                    'email-with-a-call-to-action': [
                        { prompt: '1. What is a “Call to Action” (CTA) in an email?', choices: [
                            'A personal story',
                            'A phone number',
                            'A message telling the reader what to do next',
                            'A fun quote'
                        ] },
                        { prompt: '2. Why should real estate agents include a CTA in their emails?', choices: [
                            'To fill space',
                            'To look professional',
                            'To help readers take the next step',
                            'To avoid follow-up calls'
                        ] },
                        { prompt: '3. What happens when emails do not include a clear CTA?', choices: [
                            'People reply faster',
                            'Readers get confused or take no action',
                            'You get more referrals',
                            'It increases email opens'
                        ] }
                    ],
                    'cannot-be-reached': [
                        { prompt: '1. What does it usually mean when a lead “cannot be reached”?', choices: [
                            'They hate you',
                            'They are ignoring you forever',
                            'They might not be ready yet',
                            'They moved away'
                        ] },
                        { prompt: '2. What is the best way to respond when someone does not answer right away?', choices: [
                            'Stop contacting them',
                            'Stay patient and follow up with value',
                            'Send angry messages',
                            'Complain on social media'
                        ] },
                        { prompt: '3. Why is it important to keep following up professionally?', choices: [
                            'To seem pushy',
                            'To stay top-of-mind and build trust',
                            'To fill your calendar',
                            'To avoid working with new clients'
                        ] }
                    ],
                    'thinking-of-you-video': [
                        { prompt: '1. Why is it important to let clients know you are “thinking of them”?', choices: [
                            'To ask for money',
                            'To build trust and loyalty',
                            'To sell more houses immediately',
                            'To impress other agents'
                        ] },
                        { prompt: '2. Which of these is a good way to say “thinking of you” to clients?', choices: [
                            'Ignoring them until they call',
                            'Sending a handwritten card on their home anniversary',
                            'Only calling when you need a sale',
                            'Complaining about the market'
                        ] },
                        { prompt: '3. What happens when you build emotional connections with clients?', choices: [
                            'They forget about you',
                            'They refer friends and come back',
                            'They ignore your messages',
                            'They only buy once'
                        ] }
                    ],
                    'embrace-unreasonable-persistence': [
                        { prompt: '1. What does “unreasonable persistence” mean in real estate?', choices: [
                            'Giving up after one try',
                            'Following up consistently and not giving up easily',
                            'Calling every hour nonstop',
                            'Ignoring leads'
                        ] },
                        { prompt: '2. Why is persistence important in real estate?', choices: [
                            'Because real estate decisions take time and buyers and sellers need trust',
                            'To annoy clients',
                            'To close deals in one day',
                            'To avoid talking to clients'
                        ] },
                        { prompt: '3. What mindset helps with persistence?', choices: [
                            '“If they do not answer quickly, forget them.”',
                            '“Every no brings me closer to a yes.”',
                            '“Only call once.”',
                            '“Ignore cold leads.”'
                        ] }
                    ],
                    'use-creative-follow-up-ideas': [
                        { prompt: '1. Why are creative follow-ups important in real estate?', choices: [
                            'They make you stand out and build trust',
                            'They waste time',
                            'They annoy clients',
                            'They are only for big sales'
                        ] },
                        { prompt: '2. Which of these is an example of a creative follow-up?', choices: [
                            'Sending a handwritten note with helpful tips',
                            'Calling repeatedly without a message',
                            'Sending only generic emails',
                            'Ignoring the client'
                        ] },
                        { prompt: '3. What should you focus on in a creative follow-up?', choices: [
                            'Adding value and personalization',
                            'Pushing for a quick sale',
                            'Copying other agents',
                            'Talking only about yourself'
                        ] }
                    ],
                    'i-saw-this-and-thought-of-you': [
                        { prompt: '1. What is the main idea behind “I saw this and thought of you” in real estate?', choices: [
                            'Sending generic sales messages',
                            'Showing personal care by sharing relevant information',
                            'Ignoring clients until they call',
                            'Only talking about listings'
                        ] },
                        { prompt: '2. What kind of content can you share with clients?', choices: [
                            'Local news, home tips, or market updates',
                            'Random jokes unrelated to real estate',
                            'Only your own achievements',
                            'Sales pressure messages'
                        ] },
                        { prompt: '3. Why does sharing relevant info build better client relationships?', choices: [
                            'It shows you remember and care about their interests',
                            'It forces clients to buy',
                            'It wastes time',
                            'It confuses clients'
                        ] }
                    ],
                    'personalized-singing-video': [
                        { prompt: '1. What is the main purpose of a personalized singing video in real estate?', choices: [
                            'To congratulate clients and build relationships',
                            'To sell more homes immediately',
                            'To replace the contract',
                            'To advertise other listings'
                        ] },
                        { prompt: '2. What should a personalized signing video include?', choices: [
                            'Client’s name and a warm congratulation',
                            'A long sales pitch',
                            'Only company logos',
                            'Complex legal information'
                        ] },
                        { prompt: '3. Why are personalized signing videos effective?', choices: [
                            'They create emotional connection and encourage referrals',
                            'They replace all communication',
                            'They guarantee immediate sales',
                            'They are impersonal'
                        ] }
                    ],
                    'llc-on-facebook': [
                        { prompt: '1. What does "LLC" stand for in this context?', choices: [
                            'Limited Liability Company',
                            'Learn, List, Close',
                            'Like, Like, Comment',
                            'List, Lease, Contract'
                        ] },
                        { prompt: '2. Why is LLC a powerful strategy for real estate agents on Facebook?', choices: [
                            'It makes you look busy',
                            'It boosts your ad budget',
                            'It builds visibility and relationships',
                            'It avoids interaction with people'
                        ] },
                        { prompt: '3. What kind of comment works best in the LLC method?', choices: [
                            'A random emoji',
                            'A personal, thoughtful message',
                            'A sales pitch',
                            'Just “Hi”'
                        ] }
                    ],
                    'send-a-pizza-with-a-note': [
                        { prompt: '1. What is the main idea of "Send a Pizza with a Note"?', choices: [
                            'To offer lunch deals',
                            'To build relationships through thoughtful gestures',
                            'To promote local pizza shops',
                            'To advertise pizza coupons'
                        ] },
                        { prompt: '2. Why is sending a pizza effective in real estate?', choices: [
                            'It fills people up',
                            'It creates a memorable client experience',
                            'It is cheaper than advertising',
                            'Everyone loves Italian food'
                        ] },
                        { prompt: '3. What should you include with the pizza?', choices: [
                            'A business card only',
                            'A handwritten, thoughtful note',
                            'A flyer with listings',
                            'A receipt for tax purposes'
                        ] }
                    ],
                    'photoshop-your-photo-together': [
                        { prompt: '1. What is the main purpose of Photoshopping yourself into a picture with a client?', choices: [
                            'To trick people into thinking you were there',
                            'To create a memorable and fun connection',
                            'To improve your Photoshop skills',
                            'To avoid meeting the client in person'
                        ] },
                        { prompt: '2. Why does this strategy work well in real estate?', choices: [
                            'People like fake pictures',
                            'It helps you stay serious and professional',
                            'It helps you stand out and be remembered',
                            'It replaces the need for marketing'
                        ] },
                        { prompt: '3. What might happen when you send a client a creative Photoshopped image?', choices: [
                            'They ignore it',
                            'They delete your number',
                            'They laugh, post it, and tag you',
                            'They think it is a scam'
                        ] }
                    ],
                    'show-them-on-a-magazine': [
                        { prompt: '1. What is the main idea behind featuring clients on a magazine-style layout?', choices: [
                            'To sell them a subscription',
                            'To make them feel special and celebrated',
                            'To compare them to celebrities',
                            'To advertise actual magazines'
                        ] },
                        { prompt: '2. Why is this a smart strategy in real estate?', choices: [
                            'It is a way to avoid traditional marketing',
                            'It helps you close deals faster',
                            'It turns clients into walking advertisements',
                            'It replaces good service'
                        ] },
                        { prompt: '3. What tool can you use to create a fake magazine cover?', choices: [
                            'Microsoft Excel',
                            'Canva',
                            'Zillow',
                            'A fax machine'
                        ] }
                    ],
                    'add-the-circle': [
                        { prompt: '1. What does "Add the Circle" mean in real estate?', choices: [
                            'Add more houses to your listings',
                            'Build a network of trusted people around you',
                            'Draw circles on your marketing materials',
                            'Only work with family and friends'
                        ] },
                        { prompt: '2. Why is having a circle important in real estate?', choices: [
                            'It helps you solve problems faster and get referrals',
                            'It makes your office look busier',
                            'It reduces your need to communicate',
                            'It guarantees immediate sales'
                        ] },
                        { prompt: '3. What is a good way to add someone to your circle?', choices: [
                            'Ignore them after meeting',
                            'Schedule coffee or Zoom calls to build connection',
                            'Only contact them when you need something',
                            'Spam their email with listings'
                        ] }
                    ],
                    'follow-up-like-youre-on-drugs': [
                        { prompt: '1. What does "Follow Up Like You\'re on Drugs" mean in real estate?', choices: [
                            'Follow up once and wait',
                            'Be persistent and consistent with your follow-ups',
                            'Only send emails',
                            'Avoid contacting clients too much'
                        ] },
                        { prompt: '2. How many touches does it usually take to convert a lead?', choices: [
                            '1',
                            '3',
                            '7 or more',
                            '20'
                        ] },
                        { prompt: '3. Why is persistent follow-up important?', choices: [
                            'It shows you are annoying',
                            'It helps clients remember you when they are ready',
                            'It wastes time',
                            'It scares clients away'
                        ] }
                    ],
                    'demonstrate-interest': [
                        { prompt: '1. What does it mean to "demonstrate interest" in real estate?', choices: [
                            'Talk only about yourself',
                            'Focus on closing quickly',
                            'Show you genuinely care about your client’s needs',
                            'Ignore personal details'
                        ] },
                        { prompt: '2. How can agents show genuine interest?', choices: [
                            'Ask open-ended questions',
                            'Only talk about the price',
                            'Rush the process',
                            'Avoid follow-ups'
                        ] },
                        { prompt: '3. What is a benefit of demonstrating interest in real estate?', choices: [
                            'Makes deals take longer',
                            'Clients feel valued and are more likely to work with you',
                            'Increases paperwork',
                            'Reduces communication'
                        ] }
                    ],
                    'persist-in-the-face-of-rejection': [
                        { prompt: '1. What should you do after a client says “no” to your services?', choices: [
                            'Never contact them again',
                            'Complain on social media',
                            'Follow up kindly and move forward',
                            'Forget about real estate'
                        ] },
                        { prompt: '2. What does rejection mean in real estate?', choices: [
                            'You are a bad agent',
                            'The end of your career',
                            'Feedback and a step closer to success',
                            'A personal insult'
                        ] },
                        { prompt: '3. What can rejections sometimes lead to?', choices: [
                            'Fewer opportunities',
                            'A complete loss of confidence',
                            'Future deals or referrals',
                            'A change in career'
                        ] }
                    ],
                    'stay-top-of-mind-with-newsletter-or-blog': [
                        { prompt: '1. What is the main reason real estate agents should send a newsletter or write a blog?', choices: [
                            'To close deals quickly',
                            'To remind clients that you exist and provide value',
                            'To advertise furniture',
                            'To complain about the market'
                        ] },
                        { prompt: '2. How often do most people need a real estate agent?', choices: [
                            'Every week',
                            'Every day',
                            'Not very often',
                            'Once a month'
                        ] },
                        { prompt: '3. Which agent is more likely to get future business?', choices: [
                            'The one who only calls when they need something',
                            'The one who sends helpful content regularly',
                            'The one who never communicates',
                            'The one who posts cat memes'
                        ] }
                    ],
                    'third-party-baby': [
                        { prompt: '1. What does "Third Party Baby" mean in real estate?', choices: [
                            'A baby that buys a home',
                            'Letting someone else speak on your behalf',
                            'Talking about a third property',
                            'Ignoring client opinions'
                        ] },
                        { prompt: '2. Why are client testimonials powerful?', choices: [
                            'They are expensive',
                            'They help clients believe in your value',
                            'They are hard to get',
                            'They take up too much time'
                        ] },
                        { prompt: '3. What builds more trust with potential clients?', choices: [
                            'An ad with your photo',
                            'A random quote',
                            'A past client praising your service',
                            'A funny meme'
                        ] }
                    ],
                    //Module 20 (7 videos)
                    'monday-sales-rally-recap': [
                        { prompt: '1. What is the main purpose of doing a Monday Sales Rally Recap?', choices: [
                            'To plan the weekend schedule',
                            'To remind agents to submit documents',
                            'To turn motivation into focused execution',
                            'To collect client payments'
                        ] },
                        { prompt: '2. Which of the following is a key sales metric to track weekly?', choices: [
                            'Number of business cards printed',
                            'Number of people contacted',
                            'Number of likes on social media',
                            'Number of houses built'
                        ] },
                        { prompt: '3. Why is it important to focus on “Contact → Show → Close” in real estate?', choices: [
                            'It sounds professional',
                            'It matches corporate goals',
                            'It reflects the real steps in the sales pipeline',
                            'It is a common slogan'
                        ] }
                    ],
                    'solving-and-serving-monday-sales-rally-recap': [
                        { prompt: '1. What is the main goal of “solving and serving” in real estate?', choices: [
                            'To push sales as fast as possible',
                            'To offer discounts and close fast',
                            'To understand client needs and serve their goals',
                            'To talk more and impress clients'
                        ] },
                        { prompt: '2. Which of the following best describes the difference between selling and solving?', choices: [
                            'Selling is about features; solving is about helping',
                            'Selling is slower than solving',
                            'Solving requires no product knowledge',
                            'Selling builds more trust than solving'
                        ] },
                        { prompt: '3. What is one long-term benefit of serving your clients well in real estate?', choices: [
                            'You close all deals in one meeting',
                            'You avoid paperwork',
                            'You gain referrals and repeat business',
                            'You do not need to follow up'
                        ] }
                    ],
                    'objection-handling-monday-sales-rally-recap': [
                        { prompt: '1. What is the primary purpose of objection handling in real estate?', choices: [
                            'To force clients to buy',
                            'To dismiss client concerns',
                            'To understand and address concerns',
                            'To speed up the sales process'
                        ] },
                        { prompt: '2. Which of the following is a common hidden meaning behind the objection “It\'s too expensive”?', choices: [
                            'The buyer wants a different location',
                            'The client does not trust the agent',
                            'The client does not see the value yet',
                            'The agent is too aggressive'
                        ] },
                        { prompt: '3. Which of the following best reflects a healthy mindset toward objections in real estate?', choices: [
                            'Avoid them by speaking more',
                            'Objections are signs the deal is over',
                            'Objections are opportunities to build trust',
                            'Objections mean the client is not serious'
                        ] }
                    ],
                    'mastering-the-art-of-closing-deals-monday-sales-rally-recap': [
                        { prompt: '1. What is the main goal of closing a deal in real estate?', choices: [
                            'To convince someone to buy something they do not want',
                            'To guide a client to make a confident and clear decision',
                            'To finish paperwork as fast as possible',
                            'To offer the biggest discount'
                        ] },
                        { prompt: '2. What does a master closer focus on during the closing process?', choices: [
                            'Discounts and pressure tactics',
                            'Just finishing the transaction',
                            'Service, trust, and client alignment',
                            'Avoiding objections'
                        ] },
                        { prompt: '3. What is a good way to handle a client who says, “I need to think about it”?', choices: [
                            'End the conversation immediately',
                            'Tell them to call you back',
                            'Ask what they need to feel more confident before moving forward',
                            'Offer a lower price without asking questions'
                        ] }
                    ],
                    'workplace-motivation-monday-sales-rally-recap': [
                        { prompt: '1. Why is motivation especially important in the real estate industry?', choices: [
                            'Because real estate is mostly automated',
                            'Because success is based on luck',
                            'Because it drives daily actions like calling, showing, and closing deals',
                            'Because agents do not need to do much daily'
                        ] },
                        { prompt: '2. Which of the following can help maintain workplace motivation?', choices: [
                            'Avoiding goals to reduce pressure',
                            'Celebrating small wins regularly',
                            'Working completely alone',
                            'Ignoring training and development'
                        ] },
                        { prompt: '3. What is one solution to facing rejection in real estate?', choices: [
                            'Quit the job',
                            'Complain to others',
                            'Reframe rejection as redirection',
                            'Stop making sales calls'
                        ] }
                    ],
                    'success-monday-sales-rally-recap': [
                        { prompt: '1. What is TRUE success in the real estate world?', choices: [
                            'Closing one big sale and retiring',
                            'Having a fancy office and social media following',
                            'Creating long-term stability, trust, and impact',
                            'Working alone and avoiding risks'
                        ] },
                        { prompt: '2. Which of the following is NOT one of the five pillars of success in real estate?', choices: [
                            'Relationships',
                            'Strategy',
                            'Luck',
                            'Execution'
                        ] },
                        { prompt: '3. Why is it important to define your own version of success?', choices: [
                            'So others can approve of your goals',
                            'To stay ahead of competition',
                            'To pursue it intentionally and avoid comparison',
                            'So you can work less'
                        ] }
                    ],
                    'how-to-close-a-deal-more-effectively-monday-sales-rally-recap': [
                        { prompt: '1. What is the true purpose of closing in real estate?', choices: [
                            'To convince clients to buy at any cost',
                            'To pressure the client into a fast decision',
                            'To guide the client toward the right decision confidently',
                            'To focus on your sales targets'
                        ] },
                        { prompt: '2. Which of the following is a major reason deals often do not close?', choices: [
                            'Too many property options',
                            'Mismatched expectations and lack of follow-up',
                            'High property taxes',
                            'Slow internet connection'
                        ] },
                        { prompt: '3. Which of these is a closing mindset you should have?', choices: [
                            'Focus only on your commission',
                            'Expect failure to avoid disappointment',
                            'Believe in your offer and detach from the outcome',
                            'Try to sell as fast as possible'
                        ] }
                    ],
                    //Module 21 (2 Videos)
                    'how-to-lead-by-example-friday-leadership-session-recap': [
                        { prompt: '1. What is the core meaning of "leading by example" in real estate?', choices: [
                            'Telling others what to do without doing it yourself',
                            'Giving orders to your sales team',
                            'Modeling behaviors you want others to follow',
                            'Offering discounts to win clients'
                        ] },
                        { prompt: '2. Why is it important to lead by example in the real estate world?', choices: [
                            'It helps you avoid difficult conversations',
                            'Clients will do most of the work for you',
                            'It builds trust, respect, and inspires others to follow',
                            'You do not need marketing anymore'
                        ] },
                        { prompt: '3. How can consistent leadership by example impact your real estate career?', choices: [
                            'It increases office gossip',
                            'It lowers your sales pressure',
                            'It encourages shortcuts',
                            'It earns client referrals, builds credibility, and inspires your team'
                        ] }
                    ],
                    'conflict-resolution-friday-leadership-session-recap': [
                        { prompt: '1. What is a common cause of conflict in real estate transactions?', choices: [
                            'Shared goals between buyer and seller',
                            'Misunderstandings during negotiations',
                            'Having too many buyers interested',
                            'Clear communication'
                        ] },
                        { prompt: '2. Why is conflict resolution important in real estate?', choices: [
                            'It delays transactions',
                            'It helps prevent deals from falling apart',
                            'It increases legal fees',
                            'It allows agents to avoid clients'
                        ] },
                        { prompt: '3. What should you do first when resolving a conflict?', choices: [
                            'Argue your point until you win',
                            'Stay calm and listen carefully',
                            'Ignore the problem',
                            'Take sides immediately'
                        ] }
                    ],
// ------------------- MODULE 5: CHAT SALES -------------------
    'customers-journey': [
        { prompt: '1. What is the agent’s true role in the customer journey?', choices: [
            'Just fill out paperwork',
            'Guide the client through every step with support',
            'Sell houses as quickly as possible',
            'Only help during closing'
        ] },
        { prompt: '2. When should you communicate with your client during their journey?', choices: [
            'Only when they call you',
            'After they complain',
            'Before they ask questions, staying one step ahead',
            'Only during open houses'
        ] },
        { prompt: '3. What small gesture can help you stay memorable after closing a deal?', choices: [
            'Forget about the client',
            'Send a small gift or a check-in message',
            'Ask them for more money',
            'Ignore their calls'
        ] }
    ],
    'customer-temperature-revised': [
        { prompt: '1. What does a customer’s "temperature" tell you?', choices: [
            'How angry they are',
            'How ready they are to buy or sell',
            'How rich they are',
            'What kind of property they want'
        ] },
        { prompt: '2. A "hot" customer is someone who:', choices: [
            'Is just browsing casually',
            'Has urgent needs and is ready to act now',
            'Wants to buy a home someday',
            'Refuses to talk about their plans'
        ] },
        { prompt: '3. How should you handle a "cold" lead?', choices: [
            'Pressure them to decide now',
            'Ignore them completely',
            'Stay polite, add them to your database, and focus on hotter leads',
            'Offer discounts immediately'
        ] }
    ],
    'the-hourglass': [
        { prompt: '1. In the "Hourglass" concept, what does each grain of sand represent?', choices: [
            'A new property',
            'A moment of time or an action taken',
            'A customer complaint',
            'A new license'
        ] },
        { prompt: '2. What happens to time that you waste?', choices: [
            'It can be replaced later',
            'You can flip the hourglass back',
            'It’s lost forever',
            'It earns you bonus points'
        ] },
        { prompt: '3. What should real estate agents focus on daily?', choices: [
            'Complaining about the market',
            'High-value actions like calling clients and following up',
            'Watching videos about luxury houses',
            'Waiting for clients to come to them'
        ] }
    ],
    'information-vs-connection': [
        { prompt: '1. Today, real estate clients can easily get information by:', choices: [
            'Calling every agent personally',
            'Searching online',
            'Attending open houses only',
            'Writing letters to homeowners'
        ] },
        { prompt: '2. What is something a real estate agent offers that Google cannot?', choices: [
            'Listing price information',
            'Emotional connection and trust',
            'Neighborhood statistics',
            'Mortgage calculators'
        ] },
        { prompt: '3. Which skill is most important to build strong client relationships?', choices: [
            'Talking as much as possible',
            'Memorizing every house price',
            'Deep listening and showing care',
            'Sending daily emails'
        ] }
    ],
    'tip-1-always-end-your-chat-with-questions': [
        { prompt: '1. Why is it important to end a conversation with a question?', choices: [
            'To get more information about the client',
            'To keep the conversation alive and moving forward',
            'To avoid talking too much',
            'To say goodbye quickly'
        ] },
        { prompt: '2. What happens if you end a conversation without asking a question?', choices: [
            'The client feels more connected to you',
            'The conversation dies and may not continue',
            'You can relax and move on to other tasks',
            'The client will instantly schedule a meeting'
        ] },
        { prompt: '3. Which of the following is an example of a good closing question?', choices: [
            '"Do you like the house?"',
            '"When would be a good time for us to schedule a showing?"',
            '"What price do you think the house is worth?"',
            '"Can you call me back later?"'
        ] }
    ],
    'tip-2-always-acknowledge': [
        { prompt: '1. What does it mean to "Always Acknowledge" in real estate communication?', choices: [
            'Agree with everything the client says',
            'Avoid conflict by staying silent',
            'Recognize and respond to the client’s message or concern',
            'Wait to reply until you have a full solution'
        ] },
        { prompt: '2. Why is acknowledgment important when dealing with buyers and sellers?', choices: [
            'It helps close deals faster',
            'It builds trust and shows professionalism',
            'It avoids having to explain things',
            'It guarantees higher commissions'
        ] },
        { prompt: '3. A client says they’re frustrated that no offers have come in. What is the best response?', choices: [
            '“That’s normal, just be patient.”',
            '“I understand how that feels—let’s talk about what we can adjust.”',
            'Ignore the comment and change the subject',
            '“Maybe your expectations are too high.”'
        ] }
    ],
    'tip-3-friendly-and-professional': [
        { prompt: '1. What is the best way to describe a real estate agent who is both friendly and professional?', choices: [
            'They act like a client’s best friend',
            'They talk only about business',
            'They are warm, respectful, and reliable',
            'They avoid emotional conversations'
        ] },
        { prompt: '2. True or False: Being friendly means you should use lots of slang and emojis in client emails.', choices: [
            'True',
            'False'
        ] },
        { prompt: '3. A client arrives late to a showing. What’s the best response?', choices: [
            '“You’re really late—next time be on time.”',
            '“No problem! Let’s get started so we stay on track.”',
            'Ignore them',
            '“This is why we can’t get anything done.”'
        ] }
    ],
    'tip-4-type-etiquette': [
        { prompt: '1. Why is it important to write clearly and professionally in real estate messages?', choices: [
            'To sound cool',
            'So clients can understand and trust you',
            'To impress your friends',
            'Because it’s fun'
        ] },
        { prompt: '2. Which of the following is a professional way to begin an email?', choices: [
            '“Yo, wassup?”',
            '“Hey!!!!”',
            '“Hi Sarah,”',
            'No greeting at all'
        ] },
        { prompt: '3. What should you do before sending an important email or text?', choices: [
            'Add emojis everywhere',
            'Send it immediately without reading',
            'Call instead',
            'Proofread for errors and clarity'
        ] }
    ],
    'tip-5-get-the-details': [
        { prompt: '1. Why is it important to “get the details” when working with a client?', choices: [
            'To sound smart',
            'To avoid asking more questions later',
            'To provide accurate service and prevent mistakes',
            'So you can sell faster'
        ] },
        { prompt: '2. Which of the following is the BEST question to ask a new buyer client?', choices: [
            '“You want something nice, right?”',
            '“How soon can you buy?”',
            '“What’s your favorite color?”',
            '“What are your must-haves and deal-breakers in a home?”'
        ] },
        { prompt: '3. True or False: It’s okay to guess a client’s budget if they haven’t said it clearly.', choices: [
            'True',
            'False'
        ] }
    ],
    'tip-6-keep-branding-consistent': [
        { prompt: '1. Why is it important to keep your branding consistent?', choices: [
            'To confuse your clients',
            'So people remember and trust your brand',
            'To try different styles every day',
            'Because everyone else does'
        ] },
        { prompt: '2. True or False: You should use the same logo, colors, and style across all platforms.', choices: [
            'True',
            'False'
        ] },
        { prompt: '3. What is a good example of consistent branding?', choices: [
            'Using different headshots for each social media page',
            'Always using your brand colors and logo on all flyers',
            'Changing your fonts randomly',
            'Posting casual and off-topic content only'
        ] }
    ],
    'tip-7-develop-a-personality': [
        { prompt: '1. Why is personality important in real estate?', choices: [
            'It helps you close paperwork faster',
            'It helps you stand out and build trust with clients',
            'It saves time during house tours',
            'It lowers property prices'
        ] },
        { prompt: '2. What do clients often remember most about a real estate agent?', choices: [
            'The list price of the home',
            'The agent’s clothes',
            'How the agent made them feel',
            'The agent’s handwriting'
        ] },
        { prompt: '3. What is the best way to show your personality?', choices: [
            'Copy how other agents speak',
            'Be quiet and neutral',
            'Be authentic and let your natural style show',
            'Talk about yourself only'
        ] }
    ],
    'tip-8-dont-be-a-machine-gun': [
        { prompt: '1. What does “being a machine gun” mean in real estate conversations?', choices: [
            'Giving away free property info',
            'Talking too fast and too much without stopping',
            'Showing homes with too much energy',
            'Being quiet during tours'
        ] },
        { prompt: '2. Why is over-talking a problem in real estate?', choices: [
            'It gives the client too many choices',
            'It makes you sound too professional',
            'It can overwhelm or push away the client',
            'It helps you close faster'
        ] },
        { prompt: '3. What is a better communication style than over-talking?', choices: [
            'Rapid listing of property features',
            'Only texting clients',
            'Speaking in short bursts and asking open-ended questions',
            'Using big words to impress clients'
        ] }
    ],
    'tip-9-don-t-keep-your-customer-waiting': [
        { prompt: '1. Why is responding quickly to clients important in real estate?', choices: [
            'To appear busy',
            'To reduce your workload',
            'To build trust and keep the client\'s momentum',
            'To delay decision-making'
        ] },
        { prompt: '2. What do clients often feel when an agent takes too long to respond?', choices: [
            'More confident',
            'Rejected or ignored',
            'Grateful for the space',
            'Excited to wait'
        ] },
        { prompt: '3. Which of the following is a good habit to improve your response time?', choices: [
            'Only check messages at night',
            'Use auto-replies and set check-in times',
            'Wait until you’re free for the day',
            'Let the client follow up first'
        ] }
    ],
    'tip-10-drive-the-conversation': [
        { prompt: '1. What does it mean to “drive the conversation” in real estate?', choices: [
            'Letting the client do all the talking',
            'Asking leading questions and guiding the discussion',
            'Talking non-stop about your listings',
            'Avoiding personal questions'
        ] },
        { prompt: '2. Why is it important to take the lead in a real estate conversation?', choices: [
            'To sound like you know everything',
            'To confuse the client into making decisions',
            'To provide structure, clarity, and confidence',
            'To control their emotions'
        ] },
        { prompt: '3. What should you do when a client says, “We’re just looking”?', choices: [
            'End the conversation',
            'Ask what kind of listings they want',
            'Say “okay” and wait for them to message again',
            'Dig deeper with a follow-up question like “Are you looking more for investment or future home?”'
        ] }
    ],
    'tip-11-always-be-honest': [
        { prompt: '1. Why is honesty important in real estate?', choices: [
            'To close deals faster',
            'To impress clients with confidence',
            'To build trust and long-term relationships',
            'To avoid explaining things'
        ] },
        { prompt: '2. What should you do if a property is overpriced?', choices: [
            'Say nothing and let the client decide',
            'Encourage the client to buy it anyway',
            'Be honest and offer better options',
            'Avoid discussing the price'
        ] },
        { prompt: '3. What happens when clients find out you lied to them?', choices: [
            'They respect your hustle',
            'They refer you more clients',
            'They lose trust and stop working with you',
            'They ignore it'
        ] }
    ],
    'tip-12-keep-the-chat-positive': [
        { prompt: '1. Why is it important to keep the chat positive in real estate?', choices: [
            'To entertain the client',
            'To avoid giving too much information',
            'To build trust and make clients feel confident',
            'To end conversations faster'
        ] },
        { prompt: '2. What should you say instead of “The market is too competitive right now”?', choices: [
            'Let’s wait a year.',
            'Let’s use smart strategies to stand out in this market.',
            'Good luck, it’s really hard out there.',
            'This is not a good time.'
        ] },
        { prompt: '3. How should you respond if a client says, “Everything is too expensive”?', choices: [
            'Yeah, you’re right. It’s hopeless.',
            'Let’s stop for now.',
            'That’s a real concern. Let’s find the best value for your budget.',
            'There’s nothing I can do.'
        ] }
    ],
    'tip-13-chat-as-you-talk': [
        { prompt: '1. What does “chat as you talk” mean in real estate communication?', choices: [
            'Use fancy legal words',
            'Talk like a robot',
            'Write messages in a clear, friendly, natural way',
            'Only send long emails'
        ] },
        { prompt: '2. Which of these is a good example of a “chat as you talk” message?', choices: [
            'Dear client, please confirm your intent.',
            'Hi Sarah! Just confirming our showing at 3 PM. 😊',
            'ASAP respond!',
            'Per our conversation, attached hereto is said property.'
        ] },
        { prompt: '3. True or False: Using a friendly tone helps build trust with clients.', choices: [
            'True',
            'False'
        ] }
    ],
    'tip-14-handle-humor-with-care': [
        { prompt: '1. What is the main reason to be careful with humor in real estate?', choices: [
            'It makes people laugh too much',
            'It can confuse or offend clients if not used wisely',
            'It\'s not allowed',
            'All clients love jokes'
        ] },
        { prompt: '2. True or False: You should never joke about money, contracts, or delays with clients.', choices: [
            'True',
            'False'
        ] },
        { prompt: '3. Which of these is a good example of safe humor?', choices: [
            'You’ll love this place—it doesn’t even have Wi-Fi!',
            'Don’t worry—I’m your paperwork guide through the jungle!',
            'This house looks like a haunted shack lol.',
            'Haha, your offer probably won’t get accepted anyway.'
        ] }
    ],
    'tip-15-end-on-a-high-note': [
        { prompt: '1. What does “end on a high note” mean?', choices: [
            'End the conversation quickly',
            'Leave the client feeling confused',
            'Finish strong with a positive and helpful tone',
            'Say as little as possible'
        ] },
        { prompt: '2. True or False: The last thing you say to a client doesn’t really matter.', choices: [
            'True',
            'False'
        ] },
        { prompt: '3. Which of these is a good example of ending on a high note?', choices: [
            'I’ll get back to you sometime.',
            'We’ll talk later or not—up to you.',
            'Thanks again! I’ll send you updates tomorrow—excited to help you!',
            '[No response]'
        ] }
    ],
    'r2': [
        { prompt: '1. What does “end on a high note” mean?', choices: [
            'End the conversation quickly',
            'Leave the client feeling confused',
            'Finish strong with a positive and helpful tone',
            'Say as little as possible'
        ] },
        { prompt: '2. True or False: The last thing you say to a client doesn’t really matter.', choices: [
            'True',
            'False'
        ] },
        { prompt: '3. Which of these is a good example of ending on a high note?', choices: [
            'I’ll get back to you sometime.',
            'We’ll talk later or not—up to you.',
            'Thanks again! I’ll send you updates tomorrow—excited to help you!',
            '[No response]'
        ] }
    ],
    // ------------------- MODULE 6: THE OPENING -------------------
        'importance-of-the-opening': [
            { prompt: '1. Why is the opening of a conversation important in real estate?', choices: [
                'It fills time',
                'It sets a positive tone and builds trust',
                'It makes the conversation longer',
                'It doesn’t really matter'
            ] },
            { prompt: '2. True or False: A friendly opening can help you stand out from other agents.', choices: [
                'True',
                'False'
            ] },
            { prompt: '3. What is a good example of a strong opening in a text message?', choices: [
                'Hi, what do you want?',
                'Hello, this is Jamie from NextHome Realty. Saw your message about the condo—happy to help!',
                '???',
                'You still interested or not?'
            ] }
        ],
        't-i-p': [
            { prompt: '1. Why is tone important when talking to real estate clients?', choices: [
                'It makes your voice louder',
                'It shows how you feel and helps build trust',
                'It makes you talk faster',
                'It’s only important on the radio'
            ] },
            { prompt: '2. True or False: Speaking in a flat, dull voice can make you sound bored or uninterested.', choices: [
                'True',
                'False'
            ] },
            { prompt: '3. What is vocal inflection?', choices: [
                'The volume of your voice',
                'How high or low your voice sounds when you speak',
                'Changing your pitch to show emotion and meaning',
                'Speaking in a whisper'
            ] }
        ],
        'types-of-voices': [
            { prompt: '1. Which voice type is best when first greeting a new real estate lead?', choices: [
                'Angry',
                'Friendly',
                'Robotic',
                'Bored'
            ] },
            { prompt: '2. True or False: Using an empathetic voice is helpful when a client is upset or disappointed.', choices: [
                'True',
                'False'
            ] },
            { prompt: '3. What kind of voice should you use when explaining home prices or market trends?', choices: [
                'Confused',
                'Excited',
                'Professional and confident',
                'Sad'
            ] }
        ],
        'the-professional-opening': [
            { prompt: '1. What is the first thing you should do in a professional opening?', choices: [
                'Jump straight to the property price',
                'Say who you are and greet the client',
                'Ask if they’re ready to buy',
                'End the conversation quickly'
            ] },
            { prompt: '2. True or False: Your tone in a professional opening should be friendly and confident.', choices: [
                'True',
                'False'
            ] },
            { prompt: '3. Which of the following is a good example of a professional opening?', choices: [
                'Hey. Who\'s this?',
                'Hi, I’m Laura from Bright Homes Realty. I saw your inquiry about the condo and I’d love to help!',
                'You still want a house or what?',
                'Text me later.'
            ] }
        ],
        'practice-time': [
            { prompt: '1. Why is practicing real estate scripts important?', choices: [
                'So you can memorize every word perfectly',
                'To build confidence and sound more natural with clients',
                'To impress your coworkers',
                'So you don’t have to talk to clients'
            ] },
            { prompt: '2. True or False: Practicing your phone scripts can help you reduce nervousness.', choices: [
                'True',
                'False'
            ] },
            { prompt: '3. What is a good way to practice real estate communication?', choices: [
                'Ignore feedback',
                'Speak as fast as possible',
                'Record yourself and listen to how you sound',
                'Practice once a year'
            ] }
        ],
        // ------------------- MODULE 7: PROBING -------------------
        'importance-of-probing': [
            { prompt: '1. Why is probing important in real estate conversations?', choices: [
                'To uncover the client’s true needs',
                'To fill time',
                'To impress the client',
                'To avoid asking questions'
            ] },
            { prompt: '2. What is the risk of not probing enough?', choices: [
                'Missing key information and losing the sale',
                'Making the conversation shorter',
                'Building too much trust',
                'Getting too many referrals'
            ] },
            { prompt: '3. What is a good probing question?', choices: [
                '“What’s most important to you in your next home?”',
                '“Do you want to buy?”',
                '“Are you ready to sign?”',
                '“Do you like real estate?”'
            ] }
        ],
        'hierarchy-of-questioning': [
            { prompt: '1. What is the hierarchy of questioning?', choices: [
                'A sequence from general to specific questions',
                'Asking only yes/no questions',
                'Avoiding questions',
                'Telling the client what to do'
            ] },
            { prompt: '2. Why start with broad questions?', choices: [
                'To make the client comfortable and open up',
                'To rush the conversation',
                'To close the deal immediately',
                'To avoid details'
            ] },
            { prompt: '3. What is an example of a specific question?', choices: [
                '“What is your preferred move-in date?”',
                '“Do you like houses?”',
                '“Are you interested?”',
                '“What’s your name?”'
            ] }
        ],
        'professional-questions': [
            { prompt: '1. What are professional questions in real estate?', choices: [
                'Questions that help clarify the client’s needs and goals',
                'Personal questions about hobbies',
                'Questions about unrelated topics',
                'Questions with obvious answers'
            ] },
            { prompt: '2. Why use professional questions?', choices: [
                'To build trust and credibility',
                'To make the conversation longer',
                'To avoid giving advice',
                'To impress with jargon'
            ] },
            { prompt: '3. What is a good example of a professional question?', choices: [
                '“What is your budget range for this purchase?”',
                '“Do you like pizza?”',
                '“Are you from here?”',
                '“What’s your favorite color?”'
            ] }
        ],
        'art-of-note-taking': [
            { prompt: '1. Why is note-taking important during probing?', choices: [
                'To remember client details and follow up accurately',
                'To make the meeting longer',
                'To impress the client',
                'To avoid asking questions'
            ] },
            { prompt: '2. What should you focus on when taking notes?', choices: [
                'Key client needs, preferences, and objections',
                'Every word the client says',
                'Your own thoughts',
                'Unrelated topics'
            ] },
            { prompt: '3. What is a best practice for note-taking?', choices: [
                'Summarize main points and review them after the meeting',
                'Write everything verbatim',
                'Don’t take notes',
                'Only write after the meeting'
            ] }
        ],
        'questioning-sequence-hot-leads': [
            { prompt: '1. What is a hot lead?', choices: [
                'A client ready to act now',
                'Someone just browsing',
                'A cold contact',
                'A past client only'
            ] },
            { prompt: '2. What is a good first question for a hot lead?', choices: [
                '“What’s motivating your move right now?”',
                '“Do you want to buy?”',
                '“Are you interested?”',
                '“What’s your name?”'
            ] },
            { prompt: '3. Why is it important to ask about urgency?', choices: [
                'To prioritize follow-up and service',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] }
        ],
        'questioning-sequence-warm-leads': [
            { prompt: '1. What is a warm lead?', choices: [
                'A client interested but not urgent',
                'A hot lead',
                'A cold contact',
                'A past client only'
            ] },
            { prompt: '2. What is a good question for a warm lead?', choices: [
                '“What’s your timeline for making a move?”',
                '“Do you want to buy?”',
                '“Are you interested?”',
                '“What’s your name?”'
            ] },
            { prompt: '3. Why ask about timeline?', choices: [
                'To plan follow-up and provide relevant info',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] }
        ],
        'questioning-sequence-cold-leads': [
            { prompt: '1. What is a cold lead?', choices: [
                'A client not ready to act soon',
                'A hot lead',
                'A warm lead',
                'A past client only'
            ] },
            { prompt: '2. What is a good question for a cold lead?', choices: [
                '“What would need to happen for you to consider moving forward?”',
                '“Do you want to buy?”',
                '“Are you interested?”',
                '“What’s your name?”'
            ] },
            { prompt: '3. Why keep cold leads in your database?', choices: [
                'They may become warm or hot in the future',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] }
        ],
        'q-a-a': [
            { prompt: '1. What does Q-A-A stand for in probing?', choices: [
                'Question, Answer, Ask again',
                'Quickly Answer All',
                'Question and Answer',
                'Quietly Ask Again'
            ] },
            { prompt: '2. Why use the Q-A-A method?', choices: [
                'To dig deeper and get more information',
                'To end the conversation quickly',
                'To avoid details',
                'To impress the client'
            ] },
            { prompt: '3. What is a good follow-up question after an answer?', choices: [
                '“Can you tell me more about that?”',
                '“Do you want to buy?”',
                '“Are you interested?”',
                '“What’s your name?”'
            ] }
        ],
        'practice-time-probing': [
            { prompt: '1. Why is practice important for probing skills?', choices: [
                'To become more confident and effective',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] },
            { prompt: '2. What is a good way to practice probing?', choices: [
                'Role-play with a colleague or coach',
                'Read scripts silently',
                'Never practice',
                'Only practice once a year'
            ] },
            { prompt: '3. What is a sign of improved probing skills?', choices: [
                'You ask better questions and get more useful answers',
                'You talk more than listen',
                'You avoid asking questions',
                'You impress the client'
            ] }
        ],
        'six-powerful-strategies': [
            { prompt: '1. What are powerful probing strategies?', choices: [
                'Active listening, open-ended questions, clarifying, summarizing, empathy, and follow-up',
                'Talking non-stop',
                'Only asking yes/no questions',
                'Avoiding details'
            ] },
            { prompt: '2. Why use open-ended questions?', choices: [
                'To encourage clients to share more information',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] },
            { prompt: '3. What is a good example of an open-ended question?', choices: [
                '“Can you describe your ideal home?”',
                '“Do you want to buy?”',
                '“Are you interested?”',
                '“What’s your name?”'
            ] }
        ],
        'initial-discovery-questions': [
            { prompt: '1. What is the purpose of initial discovery questions?', choices: [
                'To learn about the client’s background and needs',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] },
            { prompt: '2. What is a good initial discovery question?', choices: [
                '“What brings you to the market right now?”',
                '“Do you want to buy?”',
                '“Are you interested?”',
                '“What’s your name?”'
            ] },
            { prompt: '3. Why ask about background and needs?', choices: [
                'To tailor your service and advice',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] }
        ],
        'initial-discovery-questions-part-2': [
            { prompt: '1. What is the benefit of asking follow-up discovery questions?', choices: [
                'To get deeper insights into client motivation',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] },
            { prompt: '2. What is a good follow-up question?', choices: [
                '“What’s motivating your move?”',
                '“Do you want to buy?”',
                '“Are you interested?”',
                '“What’s your name?”'
            ] },
            { prompt: '3. Why is motivation important?', choices: [
                'It drives the client’s decisions and urgency',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] }
        ],
        'deep-understanding-question': [
            { prompt: '1. What is a deep understanding question?', choices: [
                'A question that uncovers the client’s true goals and challenges',
                'A yes/no question',
                'A question about unrelated topics',
                'A question with an obvious answer'
            ] },
            { prompt: '2. Why ask deep understanding questions?', choices: [
                'To provide better solutions and advice',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] },
            { prompt: '3. What is a good example of a deep understanding question?', choices: [
                '“What challenges have you faced in your home search so far?”',
                '“Do you want to buy?”',
                '“Are you interested?”',
                '“What’s your name?”'
            ] }
        ],
        'initial-discovery-questions-part-3': [
            { prompt: '1. What is the benefit of asking about past experiences?', choices: [
                'To learn what worked or didn’t work for the client',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] },
            { prompt: '2. What is a good question about past experiences?', choices: [
                '“Have you worked with an agent before?”',
                '“Do you want to buy?”',
                '“Are you interested?”',
                '“What’s your name?”'
            ] },
            { prompt: '3. Why is this helpful?', choices: [
                'It helps you avoid repeating mistakes and build on positive experiences',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] }
        ],
        'asking-priority': [
            { prompt: '1. What is asking priority in probing?', choices: [
                'Focusing on the most important questions first',
                'Asking questions randomly',
                'Avoiding questions',
                'Impressing the client'
            ] },
            { prompt: '2. Why set priorities in your questions?', choices: [
                'To get the most valuable information early',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] },
            { prompt: '3. What is a good example of a priority question?', choices: [
                '“What is your absolute must-have in a new home?”',
                '“Do you want to buy?”',
                '“Are you interested?”',
                '“What’s your name?”'
            ] }
        ],
        'qualifying-question': [
            { prompt: '1. What is a qualifying question in real estate?', choices: [
                'A question that determines if a client is ready and able to buy',
                'A question about hobbies',
                'A question about unrelated topics',
                'A question with an obvious answer'
            ] },
            { prompt: '2. Why ask qualifying questions?', choices: [
                'To focus your time on serious clients',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] },
            { prompt: '3. What is a good example of a qualifying question?', choices: [
                '“Have you been pre-approved for a mortgage?”',
                '“Do you want to buy?”',
                '“Are you interested?”',
                '“What’s your name?”'
            ] }
        ],
        'who-is-the-decision-maker': [
            { prompt: '1. Why is it important to identify the decision maker?', choices: [
                'To ensure you are speaking with the right person',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] },
            { prompt: '2. What is a good question to identify the decision maker?', choices: [
                '“Who else will be involved in the decision?”',
                '“Do you want to buy?”',
                '“Are you interested?”',
                '“What’s your name?”'
            ] },
            { prompt: '3. Why is this important?', choices: [
                'It saves time and avoids miscommunication',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] }
        ],
        'solution-focus-questions': [
            { prompt: '1. What are solution focus questions?', choices: [
                'Questions that help clients see possible solutions',
                'Questions about unrelated topics',
                'Questions with obvious answers',
                'Questions that avoid details'
            ] },
            { prompt: '2. Why use solution focus questions?', choices: [
                'To move the conversation toward action and results',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] },
            { prompt: '3. What is a good example of a solution focus question?', choices: [
                '“What would a successful outcome look like for you?”',
                '“Do you want to buy?”',
                '“Are you interested?”',
                '“What’s your name?”'
            ] }
        ],
        'future-oriented-question': [
            { prompt: '1. What is a future oriented question?', choices: [
                'A question that helps clients imagine next steps or results',
                'A question about unrelated topics',
                'A question with an obvious answer',
                'A question that avoids details'
            ] },
            { prompt: '2. Why ask future oriented questions?', choices: [
                'To help clients visualize progress and motivate action',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] },
            { prompt: '3. What is a good example of a future oriented question?', choices: [
                '“Where do you see yourself in a year after buying?”',
                '“Do you want to buy?”',
                '“Are you interested?”',
                '“What’s your name?”'
            ] }
        ],
        'impact': [
            { prompt: '1. What is an impact question in probing?', choices: [
                'A question that explores the consequences of a decision',
                'A question about unrelated topics',
                'A question with an obvious answer',
                'A question that avoids details'
            ] },
            { prompt: '2. Why ask impact questions?', choices: [
                'To help clients understand the results of their choices',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] },
            { prompt: '3. What is a good example of an impact question?', choices: [
                '“How would this move affect your family?”',
                '“Do you want to buy?”',
                '“Are you interested?”',
                '“What’s your name?”'
            ] }
        ],
        'concern-and-objection': [
            { prompt: '1. What is a concern and objection question?', choices: [
                'A question that uncovers client worries or hesitations',
                'A question about unrelated topics',
                'A question with an obvious answer',
                'A question that avoids details'
            ] },
            { prompt: '2. Why ask about concerns and objections?', choices: [
                'To address issues early and build trust',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] },
            { prompt: '3. What is a good example of a concern question?', choices: [
                '“What concerns do you have about this process?”',
                '“Do you want to buy?”',
                '“Are you interested?”',
                '“What’s your name?”'
            ] }
        ],
        'push-back-question': [
            { prompt: '1. What is a push back question in probing?', choices: [
                'A question that gently challenges the client’s assumptions',
                'A question about unrelated topics',
                'A question with an obvious answer',
                'A question that avoids details'
            ] },
            { prompt: '2. Why use push back questions?', choices: [
                'To help clients reconsider and clarify their thinking',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] },
            { prompt: '3. What is a good example of a push back question?', choices: [
                '“What makes you feel that way?”',
                '“Do you want to buy?”',
                '“Are you interested?”',
                '“What’s your name?”'
            ] }
        ],
        'closing-question': [
            { prompt: '1. What is a closing question in probing?', choices: [
                'A question that helps move the client to a decision or next step',
                'A question about unrelated topics',
                'A question with an obvious answer',
                'A question that avoids details'
            ] },
            { prompt: '2. Why ask closing questions?', choices: [
                'To guide the client toward action',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] },
            { prompt: '3. What is a good example of a closing question?', choices: [
                '“Are you ready to take the next step?”',
                '“Do you want to buy?”',
                '“Are you interested?”',
                '“What’s your name?”'
            ] }
        ],
        'closing-question-next-step': [
            { prompt: '1. What is the next step after a closing question?', choices: [
                'Set a clear action or follow-up',
                'Make the call longer',
                'Avoid details',
                'Impress the client'
            ] },
            { prompt: '2. Why is it important to define the next step?', choices: [
                'To keep the process moving and avoid confusion',
                'To make the call longer',
                'To avoid details',
                'To impress the client'
            ] },
            { prompt: '3. What is a good example of a next step?', choices: [
                '“Let’s schedule a follow-up call for Thursday.”',
                '“Do you want to buy?”',
                '“Are you interested?”',
                '“What’s your name?”'
            ] }
        ],
                };

                // Default/fallback questions (used if no per-video questions are defined)
                var defaultQuizQuestions = [
                    { prompt: 'What does the “Iceberg Principle” suggest about success?', choices: ['Success is mostly visible','Success depends on luck','Most factors of success are hidden beneath the surface','Only skills matter'], correctIndex: 2 },
                    { prompt: 'Which of the following is an example of the “hidden” part of the iceberg?', choices: ['Appearance','Tools','Attitude and discipline','Marketing materials'], correctIndex: 2 },
                    { prompt: 'What is the key message of the “Law of the Summit”?', choices: ['Success is quick and easy','Reaching the top requires continuous effort and preparation','You only need talent','Success depends on others'], correctIndex: 1 },
                    { prompt: 'What is necessary to stay at the “summit”?', choices: ['Luck','One-time effort','Continuous growth and consistency','Delegation only'], correctIndex: 2 },
                    { prompt: 'In the “Law of the Shareholder,” who are your shareholders?', choices: ['Only company executives','Only investors','People who influence or benefit from your success (clients, team, etc.)','Competitors'], correctIndex: 2 },
                    { prompt: 'Why is understanding your “shareholders” important?', choices: ['To reduce workload','To avoid responsibility','To better serve and create value for them','To increase sales scripts'], correctIndex: 2 },
                    { prompt: 'What does M.H.S primarily focus on?', choices: ['Marketing strategies','Managing habits and systems for consistent success','Sales closing techniques','Customer complaints'], correctIndex: 1 },
                    { prompt: 'Which of the following best reflects M.H.S?', choices: ['Relying on motivation only','Building daily habits and structured systems','Avoiding routines','Working randomly'], correctIndex: 1 },
                    { prompt: 'What does KSE stand for?', choices: ['Key Sales Execution','Knowledge, Skills, Experience','Known System Efficiency','Knowledge Service Engagement'], correctIndex: 1 },
                    { prompt: 'Why is developing KSE important for an agent?', choices: ['It reduces effort','It builds long-term competence and performance','It replaces training','It focuses only on knowledge'], correctIndex: 1 },
                    { prompt: 'Which of the following best describes “Knowledge” in KSE?', choices: ['Practical execution','Information and understanding of concepts','Past results','Communication style'], correctIndex: 1 },
                    { prompt: 'Which part of KSE is gained mostly through practice?', choices: ['Knowledge','Skills','Experience','Systems'], correctIndex: 1 },
                    { prompt: 'What is a key trait shared across all the training principles?', choices: ['Dependence on others','Short-term thinking','Continuous improvement and discipline','Avoiding challenges'], correctIndex: 2 },
                    { prompt: 'Which behavior aligns with successful agents based on the training?', choices: ['Waiting for opportunities','Taking shortcuts','Consistently improving and taking action','Avoiding feedback'], correctIndex: 2 },
                    { prompt: 'What is the main goal of these training principles for agents?', choices: ['To memorize concepts','To pass quizzes only','To build a strong foundation for long-term success','To focus only on sales'], correctIndex: 2 }
                ];

                // Helper to get quiz questions for a given video contentId
                function getQuizQuestionsForVideo(contentId) {
                    return videoQuizQuestions[contentId] || defaultQuizQuestions;
                }
    var THEME_STORAGE_KEY = 'tpl1-theme';
    var TRAINING_DURATION_CACHE_KEY = 'tpl1-training-duration-cache-v1';
    var AGENT_FOUNDATION_GROUP_TITLE = 'Agent Foundation Training';

    var TRAINING_VIDEO_GENERIC_THUMBNAIL = '/static/images/thumb-law-of-the-iceberg.svg';

    function buildTrainingContentId(title) {
        return String(title || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || '';
    }

    function escapeSvgText(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeTrainingTitleForThumbnail(title) {
        return String(title || '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function splitTitleForThumbnail(title, maxCharsPerLine) {
        var words = normalizeTrainingTitleForThumbnail(title).split(' ');
        var lines = [];
        var current = '';
        var i;

        for (i = 0; i < words.length; i += 1) {
            var word = words[i];
            var candidate = current ? (current + ' ' + word) : word;
            if (candidate.length <= maxCharsPerLine || !current) {
                current = candidate;
            } else {
                lines.push(current);
                current = word;
            }
        }

        if (current) {
            lines.push(current);
        }

        if (lines.length <= 2) {
            return lines;
        }

        var collapsed = [lines[0], lines.slice(1).join(' ')];
        var secondLineLimit = Math.max(12, maxCharsPerLine - 3);
        if (collapsed[1].length > secondLineLimit) {
            collapsed[1] = collapsed[1].slice(0, secondLineLimit).trimEnd() + '...';
        }
        return collapsed;
    }

    function getModuleBadgeLabel(moduleId) {
        var match = String(moduleId || '').match(/module_(\d+)/i);
        if (match && match[1]) {
            return 'MODULE ' + String(Number(match[1]));
        }
        return 'TRAINING';
    }

    function toModuleTitleCase(value) {
        var minorWords = {
            a: true,
            an: true,
            and: true,
            as: true,
            at: true,
            but: true,
            by: true,
            for: true,
            from: true,
            in: true,
            of: true,
            on: true,
            or: true,
            the: true,
            to: true,
            vs: true,
            via: true
        };

        return String(value || '')
            .trim()
            .toLowerCase()
            .split(/\s+/)
            .map(function (word, index) {
                if (!word) {
                    return '';
                }
                if (index > 0 && minorWords[word]) {
                    return word;
                }
                return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .join(' ');
    }

    function formatAgentFoundationModuleTitle(moduleTitle) {
        var raw = String(moduleTitle || '').trim();
        var match = raw.match(/^(module\s+\d+\s*:)(.*)$/i);
        if (!match) {
            return raw;
        }

        var moduleLabel = match[1].toUpperCase();
        var moduleName = toModuleTitleCase(match[2]);
        return moduleName ? (moduleLabel + ' ' + moduleName) : moduleLabel;
    }

    function buildTrainingThumbnailDataUri(title, moduleId) {
        var safeTitle = normalizeTrainingTitleForThumbnail(title) || 'Inner SPARC Training';
        var lines = splitTitleForThumbnail(safeTitle, 30);
        var badgeLabel = getModuleBadgeLabel(moduleId);
        var titleLine1 = escapeSvgText(lines[0] || safeTitle);
        var titleLine2 = escapeSvgText(lines[1] || '');

        var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" role="img" aria-label="' + escapeSvgText(safeTitle) + ' thumbnail">' +
            '<defs>' +
                '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#2f79df"/><stop offset="100%" stop-color="#66abf1"/></linearGradient>' +
                '<radialGradient id="glow" cx="0.9" cy="0.08" r="0.7"><stop offset="0%" stop-color="rgba(255,255,255,0.35)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient>' +
                '<linearGradient id="panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="rgba(255,255,255,0.14)"/><stop offset="100%" stop-color="rgba(255,255,255,0.06)"/></linearGradient>' +
            '</defs>' +
            '<rect width="1280" height="720" fill="url(#bg)"/>' +
            '<rect width="1280" height="720" fill="url(#glow)"/>' +
            '<g opacity="0.08"><path d="M-120,640 L460,220" stroke="#fff" stroke-width="3"/><path d="M120,760 L720,280" stroke="#fff" stroke-width="2"/><path d="M580,760 L1280,160" stroke="#fff" stroke-width="2"/></g>' +
            '<rect x="64" y="64" width="1152" height="592" rx="28" fill="url(#panel)" stroke="rgba(255,255,255,0.34)"/>' +
            '<rect x="96" y="138" width="190" height="42" rx="21" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.32)"/>' +
            '<text x="191" y="166" fill="#eaf5ff" font-size="20" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-weight="700" letter-spacing="1">' + escapeSvgText(badgeLabel) + '</text>' +
            '<text x="96" y="350" fill="#fff" font-size="66" font-family="Poppins, Arial, sans-serif" font-weight="700">' + titleLine1 + '</text>' +
            (titleLine2 ? '<text x="96" y="420" fill="#fff" font-size="58" font-family="Poppins, Arial, sans-serif" font-weight="700">' + titleLine2 + '</text>' : '') +
            '<text x="96" y="490" fill="rgba(255,255,255,0.92)" font-size="33" font-family="Poppins, Arial, sans-serif" font-weight="600">Inner SPARC Training</text>' +
            '</svg>';

        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    }

    function buildWelcomeOrientationThumbnailDataUri() {
        var titleLine = escapeSvgText('Welcome Orientation');
        var subtitleLine = escapeSvgText('Inner SPARC Training');
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 1280" role="img" aria-label="Welcome orientation thumbnail">' +
            '<defs>' +
                '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#2f79df"/><stop offset="100%" stop-color="#66abf1"/></linearGradient>' +
                '<radialGradient id="glow" cx="0.9" cy="0.08" r="0.7"><stop offset="0%" stop-color="rgba(255,255,255,0.35)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></radialGradient>' +
                '<linearGradient id="panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="rgba(255,255,255,0.14)"/><stop offset="100%" stop-color="rgba(255,255,255,0.06)"/></linearGradient>' +
            '</defs>' +
            '<rect width="720" height="1280" fill="url(#bg)"/>' +
            '<rect width="720" height="1280" fill="url(#glow)"/>' +
            '<g opacity="0.08"><path d="M-80,1080 L360,520" stroke="#fff" stroke-width="3"/><path d="M40,1300 L520,620" stroke="#fff" stroke-width="2"/><path d="M260,1340 L760,500" stroke="#fff" stroke-width="2"/></g>' +
            '<rect x="44" y="88" width="632" height="1104" rx="28" fill="url(#panel)" stroke="rgba(255,255,255,0.34)"/>' +
            '<text x="72" y="700" fill="#fff" font-size="62" font-family="Poppins, Arial, sans-serif" font-weight="700">' + titleLine + '</text>' +
            '<text x="72" y="770" fill="rgba(255,255,255,0.92)" font-size="34" font-family="Poppins, Arial, sans-serif" font-weight="600">' + subtitleLine + '</text>' +
            '</svg>';

        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    }

    var WELCOME_ORIENTATION_THUMBNAIL = buildWelcomeOrientationThumbnailDataUri();

    function makeTrainingVideo(moduleId, title, storageKey, videoSrcPath, contentId, thumbnailSrc, durationLabel) {
        return {
            moduleId: moduleId,
            title: title,
            storageKey: storageKey,
            videoSrcPath: videoSrcPath,
            contentId: contentId || buildTrainingContentId(title),
            thumbnailSrc: buildTrainingThumbnailDataUri(title, moduleId),
            durationLabel: durationLabel || '--:--'
        };
    }

    var TRAINING_VIDEO_MODULES = [
        {
            moduleId: 'module_1_welcome',
            moduleTitle: 'MODULE 1: WELCOME',
            videos: [
                makeTrainingVideo('module_1_welcome', 'Instruction to Team Leader', 'beta_video_1_done', '/portal-onboarding/video-proxy/?file_id=1O1U6RpzJ8kHmFuEvd3TzhTKljIwqqNNw', 'instruction-to-team-leader', '/static/images/thumb-instruction-to-team-leader.svg'),
                makeTrainingVideo('module_1_welcome', 'Intro to Participants', 'beta_video_2_done', '/portal-onboarding/video-proxy/?file_id=1EMhhAIY4SMuTsC13O16pluM68tdbNGsC', 'intro-to-participants', '/static/images/thumb-law-of-the-summit.svg')
            ]
        },
        {
            moduleId: 'module_2_setting_the_stage',
            moduleTitle: 'MODULE 2: SETTING THE STAGE',
            videos: [
                makeTrainingVideo('module_2_setting_the_stage', 'Law of the Iceberg', 'beta_video_3_done', '/portal-onboarding/video-proxy/?file_id=1j6uQ1SAuI7krmvdhJ7FSb70Rw5paQasb', 'law-of-the-iceberg', '/static/images/thumb-law-of-the-iceberg.svg'),
                makeTrainingVideo('module_2_setting_the_stage', 'Law of the Summit', 'beta_video_4_done', '/portal-onboarding/video-proxy/?file_id=1chic1NgoCiM4ldO-ckUYIdj2_AvJvaG2', 'law-of-the-summit', '/static/images/thumb-law-of-the-summit.svg'),
                makeTrainingVideo('module_2_setting_the_stage', 'Law of the Shareholder', 'beta_video_5_done', '/portal-onboarding/video-proxy/?file_id=1KSiJuvjznS8_3B3rCT8Ls5uohHcXqUA0', 'law-of-the-shareholder', '/static/images/thumb-law-of-the-shareholder.svg'),
                makeTrainingVideo('module_2_setting_the_stage', 'M.H.S.', 'beta_video_6_done', '/portal-onboarding/video-proxy/?file_id=1R7Z6r319ppE9E0FTtMiq-xv8ieInvhKJ', 'm-h-s', '/static/images/thumb-mhs.svg'),
                makeTrainingVideo('module_2_setting_the_stage', 'Develop Your KSE', 'beta_video_7_done', '/portal-onboarding/video-proxy/?file_id=18CRTmrcgY5GKv_Tx1zw2I1gYU_J3FEtc', 'develop-your-kse', '/static/images/thumb-develop-your-kse.svg')
            ]
        },
        {
            moduleId: 'module_3_money_mindset',
            moduleTitle: 'MODULE 3: MONEY MINDSET',
            videos: [
                makeTrainingVideo('module_3_money_mindset', 'Mindset 1 - You\'re Not Poor', 'beta_video_8_done', '/portal-onboarding/video-proxy/?file_id=1mzyocFYm5V6PUIQ7dgvaZAsuDIajSJ8F', 'mindset-1-youre-not-poor'),
                makeTrainingVideo('module_3_money_mindset', 'Mindset 2 - The Philippines is RICH', 'beta_video_9_done', '/portal-onboarding/video-proxy/?file_id=11UL68piMMkTpOPr-fxNaW_lelAnxG6yG', 'mindset-2-the-philippines-is-rich'),
                makeTrainingVideo('module_3_money_mindset', 'Mindset 3 - Pinoys are RICH', 'beta_video_10_done', '/portal-onboarding/video-proxy/?file_id=1xR6cWK-uydGT-WcNfT4VQR2eBxwd0mLr', 'mindset-3-pinoys-are-rich'),
                makeTrainingVideo('module_3_money_mindset', 'Mindset 4 - Strangers Friends', 'beta_video_11_done', '/portal-onboarding/video-proxy/?file_id=1WAtoHVq3O18_VXPAaSr-9dctAeGgyDh3', 'mindset-4-strangers-friends'),
                makeTrainingVideo('module_3_money_mindset', 'Mindset 5 - We have more than enough', 'beta_video_12_done', '/portal-onboarding/video-proxy/?file_id=1EM9JUH5kC-qTbXkkVno8ArKab_uNWBis', 'mindset-5-we-have-more-than-enough')
            ]
        },
        {
            moduleId: 'module_4_success_mindset',
            moduleTitle: 'MODULE 4: SUCCESS MINDSET',
            videos: [
                makeTrainingVideo('module_4_success_mindset', 'Where\'s the Master Key', 'beta_video_13_done', '/portal-onboarding/video-proxy/?file_id=1BAg43NGMSCB9nlZw3zeGQO84YnJKRDa5', 'wheres-the-master-key'),
                makeTrainingVideo('module_4_success_mindset', 'Tell Yourself a Lie', 'beta_video_14_done', '/portal-onboarding/video-proxy/?file_id=1yekDAfjlTlrZOE_gYI9eJ7cju804CJTs', 'tell-yourself-a-lie'),
                makeTrainingVideo('module_4_success_mindset', 'Gutom Ka', 'beta_video_15_done', '/portal-onboarding/video-proxy/?file_id=1STQpsgIQrjcuir2v3i9K4szhGUqmlk_Q', 'gutom-ka'),
                makeTrainingVideo('module_4_success_mindset', 'Lost Gold', 'beta_video_16_done', '/portal-onboarding/video-proxy/?file_id=12abvJENHCunj3IiYNRbMC_336-NVnArL', 'lost-gold'),
                makeTrainingVideo('module_4_success_mindset', 'Don\'t Overcomplicate', 'beta_video_17_done', '/portal-onboarding/video-proxy/?file_id=1gij4bOM1uFX78MW3dpg158IN5R8OF2GS', 'dont-overcomplicate'),
                makeTrainingVideo('module_4_success_mindset', 'Be Like Spotify', 'beta_video_18_done', '/portal-onboarding/video-proxy/?file_id=1w8RXtaCP5zLLBVstyo3Pf1Dy3ckEi3_W', 'be-like-spotify'),
                makeTrainingVideo('module_4_success_mindset', 'Deathbed', 'beta_video_19_done', '/portal-onboarding/video-proxy/?file_id=1bOn2Jxg0Hw3_bBoj72DgwTx8NsNLXD8I', 'deathbed'),
                makeTrainingVideo('module_4_success_mindset', 'Eyes on the Prize', 'beta_video_20_done', '/portal-onboarding/video-proxy/?file_id=1xoJ_VJC2cI1PLl20oekdVK2C6gVxdbdO', 'eyes-on-the-prize'),
                makeTrainingVideo('module_4_success_mindset', 'Keep a Track Record', 'beta_video_21_done', '/portal-onboarding/video-proxy/?file_id=19-SC70y5_zu64BALgkXHNmS3gvqEYzr8', 'keep-a-track-record'),
                makeTrainingVideo('module_4_success_mindset', 'Pocket Library', 'beta_video_22_done', '/portal-onboarding/video-proxy/?file_id=1HesLaocvspT0BYYjiZvTYK0ZKUGB8955', 'pocket-library'),
                makeTrainingVideo('module_4_success_mindset', 'Push Your Buttons', 'beta_video_23_done', '/portal-onboarding/video-proxy/?file_id=1J0Uli1elwbBVjQgOtr7kMi_jSV9tGJkl', 'push-your-buttons'),
                makeTrainingVideo('module_4_success_mindset', 'Sweat in Peace', 'beta_video_24_done', '/portal-onboarding/video-proxy/?file_id=1XNIrtMYYSADfiES9o2kVJF4cICKDLNOX', 'sweat-in-peace'),
                makeTrainingVideo('module_4_success_mindset', 'Welcome the Unexpected', 'beta_video_25_done', '/portal-onboarding/video-proxy/?file_id=1pMbY2id16kJSFTM4CGSBTbDi3UR97PVp', 'welcome-the-unexpected')
            ]
        },
        {
            moduleId: 'module_5_chat_sales',
            moduleTitle: 'MODULE 5: CHAT SALES',
            videos: [
                makeTrainingVideo('module_5_chat_sales', 'Customers Journey', 'beta_video_26_done', '/portal-onboarding/video-proxy/?file_id=1lM00Htco2naut5SDk-y6-6xTLuAodJY_', 'customers-journey', null, '4:32'),
                makeTrainingVideo('module_5_chat_sales', 'Customer Temperature Revised', 'beta_video_27_done', '/portal-onboarding/video-proxy/?file_id=1eiVmaffwVfqmIp2GwILfbRU1CtpDsgoR', 'customer-temperature-revised', null, '5:18'),
                makeTrainingVideo('module_5_chat_sales', 'The Hourglass', 'beta_video_28_done', '/portal-onboarding/video-proxy/?file_id=1Zp4t9EjqUbMj48uNRVbFuL-CA-IthjTj', 'the-hourglass', null, '3:45'),
                makeTrainingVideo('module_5_chat_sales', 'Information VS Connection', 'beta_video_29_done', '/portal-onboarding/video-proxy/?file_id=1dwyxxA8q8IBPYQbWJ5NcF30PfXGEZIS3', 'information-vs-connection', null, '6:12'),
                makeTrainingVideo('module_5_chat_sales', 'Tip 1 Always end your chat with questions', 'beta_video_30_done', '/portal-onboarding/video-proxy/?file_id=1cP1kOKRAXxpWOfaIrCxG0ot0xvnbdU_d', 'tip-1-always-end-your-chat-with-questions', null, '2:30'),
                makeTrainingVideo('module_5_chat_sales', 'Tip 2 Always Acknowledge', 'beta_video_31_done', '/portal-onboarding/video-proxy/?file_id=1RvJh2NWHZF79ywM5FFkq-cnVzGtAxNHq', 'tip-2-always-acknowledge', null, '2:15'),
                makeTrainingVideo('module_5_chat_sales', 'Tip 3 Friendly And Professional', 'beta_video_32_done', '/portal-onboarding/video-proxy/?file_id=1UTGH_gDFQFONbAuWb9n7W0B5MSBH_nAO', 'tip-3-friendly-and-professional', null, '2:45'),
                makeTrainingVideo('module_5_chat_sales', 'Tip 4 Type Etiquette', 'beta_video_33_done', '/portal-onboarding/video-proxy/?file_id=1RIGqM-tT0w2kB0FNzU2-1H8NbHFWynxE', 'tip-4-type-etiquette', null, '2:20'),
                makeTrainingVideo('module_5_chat_sales', 'Tip 5 Get The Details', 'beta_video_34_done', '/portal-onboarding/video-proxy/?file_id=14xNDb4XzCiXC1K3DneaQIxW4d3hz16lm', 'tip-5-get-the-details', null, '2:50'),
                makeTrainingVideo('module_5_chat_sales', 'Tip 6 Keep Branding Consistent', 'beta_video_35_done', '/portal-onboarding/video-proxy/?file_id=1ZeYYydmHkJ2XlAZHJDNUV9dhd4w8F1MY', 'tip-6-keep-branding-consistent', null, '2:35'),
                makeTrainingVideo('module_5_chat_sales', 'Tip 7 Develop A Personality', 'beta_video_36_done', '/portal-onboarding/video-proxy/?file_id=1sZcyRDF023-Cq-rqF1p7dAchrXdePcu0', 'tip-7-develop-a-personality', null, '3:10'),
                makeTrainingVideo('module_5_chat_sales', 'Tip 8 Don\'t Be A Machine Gun', 'beta_video_37_done', '/portal-onboarding/video-proxy/?file_id=1KgTeXl3GgxITEKQ9ZQGQ12R-9c3HQUN-', 'tip-8-dont-be-a-machine-gun', null, '2:40'),
                makeTrainingVideo('module_5_chat_sales', 'Tip 9 Don T Keep Your Customer Waiting', 'beta_video_38_done', '/portal-onboarding/video-proxy/?file_id=1ZQfZizXXieXkn_QsuvaN85Jp9WlHIZA7', 'tip-9-don-t-keep-your-customer-waiting', null, '1:55'),
                makeTrainingVideo('module_5_chat_sales', 'Tip 10 Drive The Conversation', 'beta_video_39_done', '/portal-onboarding/video-proxy/?file_id=1hmBp_e6Z38cdtFLpL6pyzZnPnvJbWVJx', 'tip-10-drive-the-conversation', null, '3:05'),
                makeTrainingVideo('module_5_chat_sales', 'Tip 11 Always Be Honest', 'beta_video_40_done', '/portal-onboarding/video-proxy/?file_id=1KuwmQWSqwaVrnhECDSdWZLhw5mh1rXOj', 'tip-11-always-be-honest', null, '2:25'),
                makeTrainingVideo('module_5_chat_sales', 'Tip 12 Keep The Chat Positive', 'beta_video_41_done', '/portal-onboarding/video-proxy/?file_id=1T0_jquwJgKBC8jYGCfMO_v-Yfo7aQCQx', 'tip-12-keep-the-chat-positive', null, '2:55'),
                makeTrainingVideo('module_5_chat_sales', 'Tip 13 Chat As You Talk', 'beta_video_42_done', '/portal-onboarding/video-proxy/?file_id=1CdQ6gXTtybZRbBgsIp_G8qAJQDlHpXwf', 'tip-13-chat-as-you-talk', null, '2:30'),
                makeTrainingVideo('module_5_chat_sales', 'Tip 14 Handle Humor With Care', 'beta_video_43_done', '/portal-onboarding/video-proxy/?file_id=1ZDQlz-8JJuJnkFqZZqzWca7ymQLmCfev', 'tip-14-handle-humor-with-care', null, '3:20'),
                makeTrainingVideo('module_5_chat_sales', 'Tip 15 End On A High Note', 'beta_video_44_done', '/portal-onboarding/video-proxy/?file_id=1J_9yvxzgABeD8d4vSat9gC0gACUXu2UZ', 'tip-15-end-on-a-high-note', null, '2:45'),
                makeTrainingVideo('module_5_chat_sales', 'R2', 'beta_video_164_done', '/portal-onboarding/video-proxy/?file_id=1RyBe5init__e17zetrdEM9xBfEj6dDRj', 'r2')
            ]
        },
        {
            moduleId: 'module_6_the_opening',
            moduleTitle: 'MODULE 6: THE OPENING',
            videos: [
                makeTrainingVideo('module_6_the_opening', 'Importance Of The Opening', 'beta_video_45_done', '/portal-onboarding/video-proxy/?file_id=16k-tUgOtXpq7db9sor4nIjqHs3I8YTCB', 'importance-of-the-opening', null, '5:15'),
                makeTrainingVideo('module_6_the_opening', 'T.I.P.', 'beta_video_46_done', '/portal-onboarding/video-proxy/?file_id=1g9BlXGBztp2wH5UskIHgqHFrVd0hQlNM', 't-i-p', null, '4:40'),
                makeTrainingVideo('module_6_the_opening', 'Types Of Voices', 'beta_video_47_done', '/portal-onboarding/video-proxy/?file_id=1RzIcdXi9Y4vra3hqjM3Bncz3kh8LhZoP', 'types-of-voices', null, '6:20'),
                makeTrainingVideo('module_6_the_opening', 'The Professional Opening', 'beta_video_48_done', '/portal-onboarding/video-proxy/?file_id=1jLvbQv27XJXqqN26POixA-aIMTvlXJgq', 'the-professional-opening', null, '7:35'),
                makeTrainingVideo('module_6_the_opening', 'Practice Time', 'beta_video_49_done', '/portal-onboarding/video-proxy/?file_id=1jUdDabq2RBY9q-cPEM-PD_tSLJSaUb7x', 'practice-time', null, '3:50')
            ]
        },
        {
            moduleId: 'module_7_probing',
            moduleTitle: 'MODULE 7: PROBING',
            videos: [
                makeTrainingVideo('module_7_probing', 'Importance Of Probing', 'beta_video_50_done', '/portal-onboarding/video-proxy/?file_id=1ln1yLy77DRU1MM6t4980yHXpiJIIeV4W'),
                makeTrainingVideo('module_7_probing', 'Hierarchy Of Questioning', 'beta_video_51_done', '/portal-onboarding/video-proxy/?file_id=1KI1UcFxgswLmRlM3sFpi70xyQ1QhnV1B'),
                makeTrainingVideo('module_7_probing', 'Professional Questions', 'beta_video_52_done', '/portal-onboarding/video-proxy/?file_id=1JDEGEtF4YqBQK91rtovHrZ6xZk2y3PVL'),
                makeTrainingVideo('module_7_probing', 'Art Of Note Taking', 'beta_video_53_done', '/portal-onboarding/video-proxy/?file_id=1kFvewROetxvx4F6aBE6ySS6uK1WYEm28'),
                makeTrainingVideo('module_7_probing', 'Questioning Sequence Hot Leads', 'beta_video_54_done', '/portal-onboarding/video-proxy/?file_id=1PRtEdyMni9jetizWs84u9oujvzQoW6AH'),
                makeTrainingVideo('module_7_probing', 'Questioning Sequence Warm Leads', 'beta_video_55_done', '/portal-onboarding/video-proxy/?file_id=13LWRYUKoEes0AnlW9BewxGgOyfm_39yf'),
                makeTrainingVideo('module_7_probing', 'Questioning Sequence Cold Leads', 'beta_video_56_done', '/portal-onboarding/video-proxy/?file_id=1YkLQdQkkLqjuz3F3rgOfbC7F5f20VBKq'),
                makeTrainingVideo('module_7_probing', 'Q-A-A', 'beta_video_57_done', '/portal-onboarding/video-proxy/?file_id=1vuIBfOGoRIWI6jw50YNP9iCrbzMW5Ey9'),
                makeTrainingVideo('module_7_probing', 'Practice Time', 'beta_video_58_done', '/portal-onboarding/video-proxy/?file_id=1yTWByu_3pohWiQkzC2c6wFpp7y9-RotE'),
                makeTrainingVideo('module_7_probing', 'Six Powerful Strategies', 'beta_video_59_done', '/portal-onboarding/video-proxy/?file_id=1qZKJ8mecMP6vRSbHjoHiVy5YtsqJW6Fp'),
                makeTrainingVideo('module_7_probing', 'Initial Discovery Questions', 'beta_video_60_done', '/portal-onboarding/video-proxy/?file_id=1ZtbTcpG_YceoHXw_q2OLLnDPNlgIldSp'),
                makeTrainingVideo('module_7_probing', 'Initial Discovery Questions (Part 2)', 'beta_video_61_done', '/portal-onboarding/video-proxy/?file_id=1zjWKqbvtZxafckfpAj6jFAxzsA8M0ZhA'),
                makeTrainingVideo('module_7_probing', 'Deep Understanding Question', 'beta_video_62_done', '/portal-onboarding/video-proxy/?file_id=1gpZTZo-3CUMAmxlqRPJ30_nYRu86ColC'),
                makeTrainingVideo('module_7_probing', 'Initial Discovery Questions (Part 3)', 'beta_video_63_done', '/portal-onboarding/video-proxy/?file_id=1DERrS-qZrJe_6EHWWkb0ltjYraLKlVdo'),
                makeTrainingVideo('module_7_probing', 'Asking Priority', 'beta_video_64_done', '/portal-onboarding/video-proxy/?file_id=1UYwE3BU_6TEvl-m6kb4_FJ7ZhQi6HGEx'),
                makeTrainingVideo('module_7_probing', 'Qualifying Question', 'beta_video_65_done', '/portal-onboarding/video-proxy/?file_id=1GejVSDpOiw9n_cPSeug4q1BQ9JA9vUzN'),
                makeTrainingVideo('module_7_probing', 'Who Is The Decision Maker', 'beta_video_66_done', '/portal-onboarding/video-proxy/?file_id=1ro0n9GX2xcruEkI9IXn3moyO51SNs1ao'),
                makeTrainingVideo('module_7_probing', 'Solution Focus Questions', 'beta_video_67_done', '/portal-onboarding/video-proxy/?file_id=1oRgijm2mdjSVzssraLwPOrxV-ePRAmHf'),
                makeTrainingVideo('module_7_probing', 'Future Oriented Question', 'beta_video_68_done', '/portal-onboarding/video-proxy/?file_id=1ephJb3RYKyIzPjTRW-RPqDov0EWYsSgI'),
                makeTrainingVideo('module_7_probing', 'Impact', 'beta_video_69_done', '/portal-onboarding/video-proxy/?file_id=1A-QNdmcbl9d0K0RUYwwHRuj7ijx2235e'),
                makeTrainingVideo('module_7_probing', 'Concern And Objection', 'beta_video_70_done', '/portal-onboarding/video-proxy/?file_id=1CvsLn-MbPi-tbk4YjaPcHR8FEOy5Gs_5'),
                makeTrainingVideo('module_7_probing', 'Push Back Question', 'beta_video_71_done', '/portal-onboarding/video-proxy/?file_id=1NFS_8wLvohbp30cB89qfaBX51ZJQvAcJ'),
                makeTrainingVideo('module_7_probing', 'Closing Question', 'beta_video_72_done', '/portal-onboarding/video-proxy/?file_id=1MT1gvhwswaPTHsDC8rqVE7wyQ9DvWX72'),
                makeTrainingVideo('module_7_probing', 'Closing Question (Next Step)', 'beta_video_73_done', '/portal-onboarding/video-proxy/?file_id=1uWgXvOKEeq4JOCtfUtVdBXtW0rCuFU3K')
            ]
        },
        {
            moduleId: 'module_8_recap',
            moduleTitle: 'MODULE 8: RECAP',
            videos: [
                makeTrainingVideo('module_8_recap', 'Importance Of The Recap', 'beta_video_74_done', '/portal-onboarding/video-proxy/?file_id=116fSXOV7Zbj8MEdA8UnjMHGYNfG_R4Yp'),
                makeTrainingVideo('module_8_recap', 'How To Do The Recap', 'beta_video_75_done', '/portal-onboarding/video-proxy/?file_id=1osYd67o89YkxN7MFqhlE02B1IdfVIa5I'),
                makeTrainingVideo('module_8_recap', 'Things To Avoid In The Recap', 'beta_video_76_done', '/portal-onboarding/video-proxy/?file_id=1-q8ToGLNnCQOpsHPKyjA2nh12jtm1nZh'),
                makeTrainingVideo('module_8_recap', 'Practice Time', 'beta_video_77_done', '/portal-onboarding/video-proxy/?file_id=1t-615kgXgaOOTxZOECF2g4jk_l50Oj1C')
            ]
        },
        {
            moduleId: 'module_9_conditioning',
            moduleTitle: 'MODULE 9: CONDITIONING',
            videos: [
                makeTrainingVideo('module_9_conditioning', 'Purpose Of Conditioning', 'beta_video_78_done', '/portal-onboarding/video-proxy/?file_id=1YSnNERfr3loyCatZmLQ2MUJMFWHaOEhI'),
                makeTrainingVideo('module_9_conditioning', 'How To Do Conditioning', 'beta_video_79_done', '/portal-onboarding/video-proxy/?file_id=1iBXVs59wX7WXlgQqV-kC7PPfHvc2_jrz'),
                makeTrainingVideo('module_9_conditioning', 'What To Avoid During Conditioning', 'beta_video_80_done', '/portal-onboarding/video-proxy/?file_id=1b4-UJBjkLfnd2iZN5rHzNGMaiTs4xC8v'),
                makeTrainingVideo('module_9_conditioning', 'Practice Time', 'beta_video_81_done', '/portal-onboarding/video-proxy/?file_id=1rhkPlBBgjGPHFKp6XWxvh32We_AapZCF')
            ]
        },
        {
            moduleId: 'module_10_perfect_pitch',
            moduleTitle: 'MODULE 10: PERFECT PITCH',
            videos: [
                makeTrainingVideo('module_10_perfect_pitch', 'Importance of the Pitch', 'beta_video_82_done', '/portal-onboarding/video-proxy/?file_id=1TzYMwJsADStpP5blPKkvuhAGOqgSoS59'),
                makeTrainingVideo('module_10_perfect_pitch', 'Things to Avoid During the Pitch', 'beta_video_83_done', '/portal-onboarding/video-proxy/?file_id=1xSjC66AK7NFNPz4bxL83mUdEjPmj8z-y'),
                makeTrainingVideo('module_10_perfect_pitch', 'Amateur vs Professional', 'beta_video_84_done', '/portal-onboarding/video-proxy/?file_id=1EQWy_Hgi6Ho8bj4qIrJZ7aiVJuJti9Dd'),
                makeTrainingVideo('module_10_perfect_pitch', 'Using the FAB Properly', 'beta_video_85_done', '/portal-onboarding/video-proxy/?file_id=1xj-Wm8Y8j2YgfxvLyrJ1wkPHyIaMKqYx'),
                makeTrainingVideo('module_10_perfect_pitch', 'Putting it Together', 'beta_video_86_done', '/portal-onboarding/video-proxy/?file_id=1vLg_wJ02VG3LRTNVCl17dCSavAcfagXs'),
                makeTrainingVideo('module_10_perfect_pitch', 'The Entire Structure PART 1', 'beta_video_87_done', '/portal-onboarding/video-proxy/?file_id=1vxhEuotwXMWG2nUyH44JcMZrQoX2ApmW'),
                makeTrainingVideo('module_10_perfect_pitch', 'The Entire Structure PART 2', 'beta_video_88_done', '/portal-onboarding/video-proxy/?file_id=1X6UyzY1jufl-BEKCd37xzb155TQWvMXr'),
                makeTrainingVideo('module_10_perfect_pitch', 'Practice Time', 'beta_video_89_done', '/portal-onboarding/video-proxy/?file_id=1XkuhPwzHNS7xSZaTzYj_vDErm-15ZOgT')
            ]
        },
        {
            moduleId: 'module_11_the_close',
            moduleTitle: 'MODULE 11: THE CLOSE',
            videos: [
                makeTrainingVideo('module_11_the_close', 'Importance of the Close', 'beta_video_90_done', '/portal-onboarding/video-proxy/?file_id=1TFanLHZwToCywnTQ-9Pa3cE889bVQXQ7'),
                makeTrainingVideo('module_11_the_close', 'Always Ask', 'beta_video_91_done', '/portal-onboarding/video-proxy/?file_id=1omlG1qtzjZ97EapkGik8NajDighRPwNd'),
                makeTrainingVideo('module_11_the_close', 'Trial Close', 'beta_video_92_done', '/portal-onboarding/video-proxy/?file_id=1L3oBUd8HLZ6fzK5eXYe3a2htTAeBKZO_'),
                makeTrainingVideo('module_11_the_close', 'What to Expect During the Close', 'beta_video_93_done', '/portal-onboarding/video-proxy/?file_id=1gntBqKIIKqjv9ZVDSeKC-Vs4enyfztnM'),
                makeTrainingVideo('module_11_the_close', 'Small Yeses', 'beta_video_94_done', '/portal-onboarding/video-proxy/?file_id=1w9qQa366iYX3Iteb8zFZ04NFuwmuEHmf'),
                makeTrainingVideo('module_11_the_close', 'A or B Close', 'beta_video_95_done', '/portal-onboarding/video-proxy/?file_id=1K2Gi2hZAoS8L3IV6entSolCQn0DrD7vt'),
                makeTrainingVideo('module_11_the_close', 'Where to Send Close', 'beta_video_96_done', '/portal-onboarding/video-proxy/?file_id=1TW6ZSE6OCgrVkIZC6l9adTv979j9UgSb'),
                makeTrainingVideo('module_11_the_close', 'Give it a try Close', 'beta_video_97_done', '/portal-onboarding/video-proxy/?file_id=1Sw0RboUH59yfKdhUZLgJlOpBrgZCRfxj'),
                makeTrainingVideo('module_11_the_close', 'Receive Close', 'beta_video_98_done', '/portal-onboarding/video-proxy/?file_id=1yX5HoYdbb9RtWku1ZJabiG1Vzs3icYCK'),
                makeTrainingVideo('module_11_the_close', 'Since We Are Good Close', 'beta_video_99_done', '/portal-onboarding/video-proxy/?file_id=1BFzXressqVnT6-uPZkEdVCKOOZVU7-YO'),
                makeTrainingVideo('module_11_the_close', 'Should We Max Close', 'beta_video_100_done', '/portal-onboarding/video-proxy/?file_id=1UnfMPmVf9OB137UuXBrh1fInPIHD7qIP'),
                makeTrainingVideo('module_11_the_close', 'Price Discount Close', 'beta_video_101_done', '/portal-onboarding/video-proxy/?file_id=17IgUj_tkonmeIs3AzeggfQ2iZzsyhbp6'),
                makeTrainingVideo('module_11_the_close', 'Save Opportunity Close', 'beta_video_102_done', '/portal-onboarding/video-proxy/?file_id=1hfgr7XD3nbQ6iye4_2YaTRmDZHcvIYNp'),
                makeTrainingVideo('module_11_the_close', 'Urgency Close', 'beta_video_103_done', '/portal-onboarding/video-proxy/?file_id=1dPZFGwI7ByKZKrxah7oWUmrytgPkVL1M'),
                makeTrainingVideo('module_11_the_close', 'I’M Excited For You Close', 'beta_video_104_done', '/portal-onboarding/video-proxy/?file_id=1Whuyipo1w575hLnI9BWMdoaerxSNBQyB'),
                makeTrainingVideo('module_11_the_close', 'Scale Close', 'beta_video_105_done', '/portal-onboarding/video-proxy/?file_id=1kTZz80ObMI-8JM7bS9OTjC6sD637uQ61'),
                makeTrainingVideo('module_11_the_close', 'Now Or Never Close', 'beta_video_106_done', '/portal-onboarding/video-proxy/?file_id=1LRqaIfXJ9h2twDvQAl22P50ho71fJBgK'),
                makeTrainingVideo('module_11_the_close', 'Summary Close', 'beta_video_107_done', '/portal-onboarding/video-proxy/?file_id=1MwLLW5hBoHY9Vh-DTrlBIsPIlXfcfAUg'),
                makeTrainingVideo('module_11_the_close', 'Sharp Angle Close', 'beta_video_108_done', '/portal-onboarding/video-proxy/?file_id=1JYX2OqIBn-uGDqkQlxYEGnvQTGOumdhv'),
                makeTrainingVideo('module_11_the_close', 'Do It For Me Close', 'beta_video_109_done', '/portal-onboarding/video-proxy/?file_id=1Wmau3fMEyivN2cnDNjr03hk_stXyB3SR'),
                makeTrainingVideo('module_11_the_close', 'My Life Is Yours Close', 'beta_video_110_done', '/portal-onboarding/video-proxy/?file_id=1had4RkMOdYzKxmGFeMsiuG2R1CbbLYJ0'),
                makeTrainingVideo('module_11_the_close', 'Certainty Close', 'beta_video_111_done', '/portal-onboarding/video-proxy/?file_id=1W_H1RjpIbpBaBRNtNF_qeHbvMHOxy5O7'),
                makeTrainingVideo('module_11_the_close', 'Why Me Close', 'beta_video_112_done', '/portal-onboarding/video-proxy/?file_id=1bA9V1qxPxzzYoad1Epki36aA4JFMdT4V'),
                makeTrainingVideo('module_11_the_close', 'Will I Scam You Close', 'beta_video_113_done', '/portal-onboarding/video-proxy/?file_id=1bJH4re22f86CvThqKFzB1teBmMhIiIlB'),
                makeTrainingVideo('module_11_the_close', 'Do The Math Close', 'beta_video_114_done', '/portal-onboarding/video-proxy/?file_id=1j123blZcaO91fhZflzsZzql_pNNea0rg'),
                makeTrainingVideo('module_11_the_close', 'Next Step Close', 'beta_video_115_done', '/portal-onboarding/video-proxy/?file_id=1wfpBeCsQH_-jpMP2xlsiiUWq_52pnyUW'),
                makeTrainingVideo('module_11_the_close', 'Mindset Of A Closer', 'beta_video_116_done', '/portal-onboarding/video-proxy/?file_id=1dSr3MV0pj6ltT9e54_B0gYDB3ErT7rf0'),
                makeTrainingVideo('module_11_the_close', 'Close And Open', 'beta_video_117_done', '/portal-onboarding/video-proxy/?file_id=1qWrm_jaxt7pE2Ftcs4xMe7Hx6c50RE0T')
            ]
        },
        {
            moduleId: 'module_12_customer_experience',
            moduleTitle: 'MODULE 12: CUSTOMER EXPERIENCE',
            videos: [
                makeTrainingVideo('module_12_customer_experience', 'Complaints Are Normal', 'beta_video_118_done', '/portal-onboarding/video-proxy/?file_id=14S-EYMSPRLfhu5R5IgBczqL9u_8gs7sv', 'beta_video_118_done'),
                makeTrainingVideo('module_12_customer_experience', 'Understand And Agree', 'beta_video_119_done', '/portal-onboarding/video-proxy/?file_id=1gOYcF7G8sPhruE442onNx4uCj-4KdJsy', 'understand-and-agree'),
                makeTrainingVideo('module_12_customer_experience', 'Empathy Vs Sympathy', 'beta_video_120_done', '/portal-onboarding/video-proxy/?file_id=1pESKa8UdK8qiH8Rb-2PJLnH1dW9zOopg', 'empathy-vs-sympathy')
            ]
        },
        {
            moduleId: 'module_13_objection_handling',
            moduleTitle: 'MODULE 13: OBJECTION HANDLING',
            videos: [
                makeTrainingVideo('module_13_objection_handling', 'Type Of Objections', 'beta_video_121_done', '/portal-onboarding/video-proxy/?file_id=1xoasS6XqGYNgedRQdAwTDh6tC0jrq-SS')
            ]
        },
        {
            moduleId: 'module_14_phone_sales_mastery',
            moduleTitle: 'MODULE 14: PHONE SALES MASTERY',
            videos: [
                makeTrainingVideo('module_14_phone_sales_mastery', 'U.C.T.A.', 'beta_video_122_done', '/portal-onboarding/video-proxy/?file_id=1m7-tuLUq99aXF7mviaeh-QFnCOEUKIkJ'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Closer Method', 'beta_video_123_done', '/portal-onboarding/video-proxy/?file_id=1s3u5DDG4OoOV3rWCsY4BGsg7wJdQNucY'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'It S Not What You Say', 'beta_video_124_done', '/portal-onboarding/video-proxy/?file_id=1eZ761nytfgvtelKJpkN5HmcWZqfDr_R6'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'First Rule Of Selling', 'beta_video_125_done', '/portal-onboarding/video-proxy/?file_id=17O-Gj_XEvNotFiKU7TL1ER9Qq2co1r2B'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'The Agreement Challenge', 'beta_video_126_done', '/portal-onboarding/video-proxy/?file_id=10wogYdqLDrrI1nTk-bcCf8EamsDaMJsL'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Always Set The Intention', 'beta_video_127_done', '/portal-onboarding/video-proxy/?file_id=1opUXYHT9fZd-U_kfPI1Qo4SeAC0rGtrv'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Never Lower Yourself To The Client', 'beta_video_128_done', '/portal-onboarding/video-proxy/?file_id=18Jdj4sWlc6eEL4xBaj860eGcN-bngAQE'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Create Good Hook Question', 'beta_video_129_done', '/portal-onboarding/video-proxy/?file_id=18YoloEBao9XRvQdc1ozqaxRJ-Pkte0oQ'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Ensure You Are Audible', 'beta_video_130_done', '/portal-onboarding/video-proxy/?file_id=1fCoWSCz7U25LiKzdmomKgKJOfz4i0KEY'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Actively Listen', 'beta_video_131_done', '/portal-onboarding/video-proxy/?file_id=1JP14uecETNkOrmfcj04zOOe1Ym4-LvQm'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Do Not Interrupt', 'beta_video_132_done', '/portal-onboarding/video-proxy/?file_id=144-OOdDT3Wu3BmET5t-z_RxfuPyetB8Z'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Avoid Verbal Diarrhea', 'beta_video_133_done', '/portal-onboarding/video-proxy/?file_id=1BOobkh-hy7KPWfzsfrG21J5gR4G3OuMt'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Stick To The Skeleton', 'beta_video_134_done', '/portal-onboarding/video-proxy/?file_id=1d2M61yz1VzXdo8jhYNBqrme5i1rYNQld'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Go Back To Your Intention', 'beta_video_135_done', '/portal-onboarding/video-proxy/?file_id=1imgyGuLCu8SdmfjbvRbIHqHDFnBbJQmy'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Avoid Using Jargon', 'beta_video_136_done', '/portal-onboarding/video-proxy/?file_id=1C5s7Eu2wYLyJBDff1AQIetXIJynJqhqR'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Get Back On The Phone', 'beta_video_137_done', '/portal-onboarding/video-proxy/?file_id=1HlYCSHiFuse2HQ_N4f90EjsPLkxM9wVH'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Natural Dialogue', 'beta_video_138_done', '/portal-onboarding/video-proxy/?file_id=1crRfZBksN2aXBqhZ6b6rATOqXOSvtaDI'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Limit Product Offer', 'beta_video_139_done', '/portal-onboarding/video-proxy/?file_id=1-WsOLmvHc_wJ48N5tmgawSJ-gyv3_05z'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Value-Rich', 'beta_video_140_done', '/portal-onboarding/video-proxy/?file_id=1rXuLS5yZuZBJih8l0lqw0OR_B6DTaiNo'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Exactly Why (We Need To Talk)', 'beta_video_141_done', '/portal-onboarding/video-proxy/?file_id=1ujCCY4SiCIPnzxNzKSWEfo0vN1KGk0e0'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Use Labels (Bola Method)', 'beta_video_142_done', '/portal-onboarding/video-proxy/?file_id=1n21kcEKKpOMLROftAkuOpz5W89OuBxU1'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Stand Up (Louder And Prouder)', 'beta_video_143_done', '/portal-onboarding/video-proxy/?file_id=1DJTkYy1utr-7INjQveQgWs4ZvNsrEU79'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Get Emotional', 'beta_video_144_done', '/portal-onboarding/video-proxy/?file_id=1__CPOQW2W3M3IKWAzh9v-cExe0WLLkBC'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Timing Matters', 'beta_video_145_done', '/portal-onboarding/video-proxy/?file_id=1bGxlcR-CQkpCXONOD0AiLntfwz5x5jLW'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Get Comfortable', 'beta_video_146_done', '/portal-onboarding/video-proxy/?file_id=13GSebAcKSeEdI_T9k4j4twML1VQso1wb'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Pretend You Re Looking At Them', 'beta_video_147_done', '/portal-onboarding/video-proxy/?file_id=1xAp5iOSVdCsQwqPslsNlqZ648uSkl1bF'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'It S Just A Video Game', 'beta_video_148_done', '/portal-onboarding/video-proxy/?file_id=1c9sL_obpOvncuDoz5mKvW9C7FQWukn28'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Sw3n', 'beta_video_149_done', '/portal-onboarding/video-proxy/?file_id=1zh0bRf7ZOrOfaP6Yg2j_lG04ctCFyWcl'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Scientist Mentality', 'beta_video_150_done', '/portal-onboarding/video-proxy/?file_id=1Ak_ejVODQaHcC7d4Pk77tpiS63Dp6bJ1'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Text Before And After', 'beta_video_151_done', '/portal-onboarding/video-proxy/?file_id=1E1pGb4V0HXzga1k08PpdxiDwecna2SDp'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Always Record', 'beta_video_152_done', '/portal-onboarding/video-proxy/?file_id=1kgCsFX9zu4gPXvs9ZQGSwNCtRV2zpjG1'),
                makeTrainingVideo('module_14_phone_sales_mastery', 'Get Them To Connect On Facebook', 'beta_video_153_done', '/portal-onboarding/video-proxy/?file_id=1DWuJRgHZmCwacm_Rn8KljahqPqKedW-E')
            ]
        },
        {
            moduleId: 'module_15_face_to_face_strategies',
            moduleTitle: 'MODULE 15: FACE TO FACE STRATEGIES',
            videos: [
                makeTrainingVideo('module_15_face_to_face_strategies', 'Best Known Beats Best', 'beta_video_154_done', '/portal-onboarding/video-proxy/?file_id=1xat4DEpAeYDGbaqkHT5GuDb8xBFmQIIp'),
                makeTrainingVideo('module_15_face_to_face_strategies', 'Everything Is A Funnel', 'beta_video_155_done', '/portal-onboarding/video-proxy/?file_id=11L7fzCjbTUa-KdLreULp0koP9vEonRey'),
                makeTrainingVideo('module_15_face_to_face_strategies', 'Determine Your Approach (Apple Store Vs. Hypermarket)', 'beta_video_156_done', '/portal-onboarding/video-proxy/?file_id=1lRCUEfPEK74jwxOPnQrNH7I4GlvPWxic'),
                makeTrainingVideo('module_15_face_to_face_strategies', 'Atmospheric Branding (Smell, See, Feel)', 'beta_video_157_done', '/portal-onboarding/video-proxy/?file_id=186VAgNJY4mLI5rjFlvKEly1UkDfJRA7J'),
                makeTrainingVideo('module_15_face_to_face_strategies', 'Sb Method #1 The Smile', 'beta_video_158_done', '/portal-onboarding/video-proxy/?file_id=1y0VzhL996-TDEoMGK1esL_0P_dWP-s-G'),
                makeTrainingVideo('module_15_face_to_face_strategies', 'Sb Method #2 The Name', 'beta_video_159_done', '/portal-onboarding/video-proxy/?file_id=1xZfGvEFS3Sgv63MIeyjBqTMO2ZknqngE'),
                makeTrainingVideo('module_15_face_to_face_strategies', 'Sb Method #3 Options', 'beta_video_160_done', '/portal-onboarding/video-proxy/?file_id=1JvQrxFLJOwMpk7obaV5WHk3TY77HyvkS'),
                makeTrainingVideo('module_15_face_to_face_strategies', 'Sb Method #4 The Tribox', 'beta_video_161_done', '/portal-onboarding/video-proxy/?file_id=1eAEL2adr9WR_l-ADS5iMM74J9g_MV1eJ'),
                makeTrainingVideo('module_15_face_to_face_strategies', 'Sb Method #5 Brand Championing', 'beta_video_162_done', '/portal-onboarding/video-proxy/?file_id=1z00etUFBxEBqsWoC0xZcqwtkU_8Sdkbx'),
                makeTrainingVideo('module_15_face_to_face_strategies', 'Introducing Yourself Handshaker Eye Contact, Smile (Hecs)', 'beta_video_163_done', '/portal-onboarding/video-proxy/?file_id=1nzKTIPFkd7DcyDLVidpcrzxz7xYEirwM')
            ]
        },
        {
            moduleId: 'module_16',
            moduleTitle: 'MODULE 16: HIGH TICKET OFFERS',
            videos: [
                makeTrainingVideo('module_16', 'Funnel Down', 'beta_video_165_done', '/portal-onboarding/video-proxy/?file_id=1fqiZ_ZhBLb5mEEDBBoDnMWlSS4wIXEz2'),
                makeTrainingVideo('module_16', 'Qualify Leads', 'beta_video_166_done', '/portal-onboarding/video-proxy/?file_id=1VihV-0M5BAWnl6SlPl6pgM6FaWsIB4Et'),
                makeTrainingVideo('module_16', 'Disqualifying Leads', 'beta_video_167_done', '/portal-onboarding/video-proxy/?file_id=1bjyx1CpOpDN8mjJn-6ccdoblwwRPcCSV'),
                makeTrainingVideo('module_16', 'Efficient First-Meeting Discovery Call', 'beta_video_168_done', '/portal-onboarding/video-proxy/?file_id=1Fu6mopR0Xk-VDJsoJoxkdTeJ8C5VZMnm'),
                makeTrainingVideo('module_16', 'Opening Discovery Call', 'beta_video_169_done', '/portal-onboarding/video-proxy/?file_id=1to_2WJlhnc85e9NribNEJ3IToUbml2o4'),
                makeTrainingVideo('module_16', 'Pre-Handle Objections', 'beta_video_170_done', '/portal-onboarding/video-proxy/?file_id=1fnzPoDZ9ELZ0IGBNX25JELER-GBLM9Ua'),
                makeTrainingVideo('module_16', 'Look For The Decision Maker', 'beta_video_171_done', '/portal-onboarding/video-proxy/?file_id=1OY6FakaI0eZ3eohWDKNUjFk-eUnnPJ-2'),
                makeTrainingVideo('module_16', 'Lead Towards Next Steps', 'beta_video_172_done', '/portal-onboarding/video-proxy/?file_id=1z6T3AUtRCePGRO4aolary0a5d_BjI2Jp')
            ]
        },
        {
            moduleId: 'module_17',
            moduleTitle: 'MODULE 17: SALES BEAST MINDSET',
            videos: [
                makeTrainingVideo('module_17', 'A Great Attitude Is Worth More Than A Great Product', 'beta_video_173_done', '/portal-onboarding/video-proxy/?file_id=12Ugh3h46vb8t6LIP1ISFrAhsrDIgTQc4'),
                makeTrainingVideo('module_17', 'Treat Them Like Millionaires', 'beta_video_174_done', '/portal-onboarding/video-proxy/?file_id=1wKERmyEtHZ_vjWNEeq3WqY_GgVdbhUzQ'),
                makeTrainingVideo('module_17', 'Have A Killer Instinct', 'beta_video_175_done', '/portal-onboarding/video-proxy/?file_id=1gBlbNbwwOSj6AgI96Tp3MpBylOdq2wqw'),
                makeTrainingVideo('module_17', 'A Product Of Your Environment', 'beta_video_176_done', '/portal-onboarding/video-proxy/?file_id=13OXX2U64aCcjZlQVjBlLlmVrTuyy75kt'),
                makeTrainingVideo('module_17', 'The Magic Of Give Give Give', 'beta_video_177_done', '/portal-onboarding/video-proxy/?file_id=1lBvaySB3ewFl6vIHaAVEBGLK5F_2YVt0'),
                makeTrainingVideo('module_17', 'Make Service Senior To Selling', 'beta_video_178_done', '/portal-onboarding/video-proxy/?file_id=1REhdGgQEZaooZUEeHfuo7oKpPVWvA27V'),
                makeTrainingVideo('module_17', 'It S Never About The Price', 'beta_video_179_done', '/portal-onboarding/video-proxy/?file_id=1Cwi15clJgXliE8-IyZXpWoN3hB-xe8LV'),
                makeTrainingVideo('module_17', 'The 10X Rule Part 1', 'beta_video_180_done', '/portal-onboarding/video-proxy/?file_id=1lQI-EWt-J-Ct8Ijk5p5XIhI0ovR9gZbQ'),
                makeTrainingVideo('module_17', 'The 10X Rule Part 2', 'beta_video_181_done', '/portal-onboarding/video-proxy/?file_id=1kzNiSJTKrveB8HVd5if0IkhcfofB4Cok'),
                makeTrainingVideo('module_17', 'Boba', 'beta_video_182_done', '/portal-onboarding/video-proxy/?file_id=1De1ZEQdLMKBbT8dtJXTF_GRW69o6u-qP'),
                makeTrainingVideo('module_17', 'Success Is Your Duty', 'beta_video_183_done', '/portal-onboarding/video-proxy/?file_id=1iGf1bX8WKXtdx9YIjcbkFcn2ApQlyG-D'),
                makeTrainingVideo('module_17', 'No Shortage Here', 'beta_video_184_done', '/portal-onboarding/video-proxy/?file_id=1J98TpxcQCYPEm_kG9gH8aRB7duoZvgaI'),
                makeTrainingVideo('module_17', 'Control Freak', 'beta_video_185_done', '/portal-onboarding/video-proxy/?file_id=1qQsEKzYGqYNXUAMV7hvKKieaxObyX_bX'),
                makeTrainingVideo('module_17', '4 Degrees Of Action', 'beta_video_186_done', '/portal-onboarding/video-proxy/?file_id=1dxSH7t20OG_u6fs6i_vYPw-CnNT4g7ya'),
                makeTrainingVideo('module_17', 'Competition Is For Losers', 'beta_video_187_done', '/portal-onboarding/video-proxy/?file_id=1FvwSMUmJIiN2UwcH9P459GBIq9QjkDmb'),
                makeTrainingVideo('module_17', 'Overcommit', 'beta_video_188_done', '/portal-onboarding/video-proxy/?file_id=1HO0GGPvC4yIrsh-JMZ37TF_h_NlGsqyO'),
                makeTrainingVideo('module_17', 'Expand Never Contract', 'beta_video_189_done', '/portal-onboarding/video-proxy/?file_id=1miZZuS4mGw1alnywZrK4o1D04AXd_D_i'),
                makeTrainingVideo('module_17', 'Fear Is An Indicator', 'beta_video_190_done', '/portal-onboarding/video-proxy/?file_id=1uU3CacwEcNAbfd1lOREpRr_cv1bjXXEu')
            ]
        },
        {
            moduleId: 'module_18',
            moduleTitle: 'MODULE 18: SALES CULTURE',
            videos: [
                makeTrainingVideo('module_18', 'Be A Cult', 'beta_video_191_done', '/portal-onboarding/video-proxy/?file_id=1idTOQ2HIJqNvituGfBu8YB0hV2t3q-eF'),
                makeTrainingVideo('module_18', 'Have One Voice', 'beta_video_192_done', '/portal-onboarding/video-proxy/?file_id=1U4h-AtaFWFpu6MqAM4w4Us8GQKJykj7Z'),
                makeTrainingVideo('module_18', 'Know The Mission And Vision', 'beta_video_193_done', '/portal-onboarding/video-proxy/?file_id=1MZSDlnA4rpnCReYDBB1I0mIc5SwBe2aU'),
                makeTrainingVideo('module_18', 'Embrace Your Values', 'beta_video_194_done', '/portal-onboarding/video-proxy/?file_id=1dEejJqOIjot4aNujwW2QnoG7eA5sPdwR'),
                makeTrainingVideo('module_18', 'Dress For Success', 'beta_video_195_done', '/portal-onboarding/video-proxy/?file_id=1jsOEGXY7K6VSngyv1Zv8nCfQUZhLcmUa'),
                makeTrainingVideo('module_18', 'Always Abc', 'beta_video_196_done', '/portal-onboarding/video-proxy/?file_id=1SLlBxb1yaqfHqRYCrWbSmC-_G-QAsb3A'),
                makeTrainingVideo('module_18', 'Keep Your Haircut Neat', 'beta_video_197_done', '/portal-onboarding/video-proxy/?file_id=1suVJ3qpQy8lnc3VDA8Dbvu9Ct1v0fKGb'),
                makeTrainingVideo('module_18', 'Smell Good, Do Good', 'beta_video_198_done', '/portal-onboarding/video-proxy/?file_id=1x33yEYrECdCH8Ur09OOJVerZWc2Ky3Uy'),
                makeTrainingVideo('module_18', 'Wear Your Brand With Pride', 'beta_video_199_done', '/portal-onboarding/video-proxy/?file_id=1bE_LNlnvdYlYor9D-7ueCA72rF0mB5xJ'),
                makeTrainingVideo('module_18', 'Foster A Growth Mindset', 'beta_video_200_done', '/portal-onboarding/video-proxy/?file_id=1z8SY-zY-IQQhPXEXVR50ckhTtYlzINDN'),
                makeTrainingVideo('module_18', 'Promote Team Collaboration', 'beta_video_201_done', '/portal-onboarding/video-proxy/?file_id=1DZULrIN51PrLtO9qtmjJ35JW-pSLniuw'),
                makeTrainingVideo('module_18', 'Customer-Centric Focus', 'beta_video_202_done', '/portal-onboarding/video-proxy/?file_id=1AVfH8UvBctBpmXb8ADjoqeUwH2Z2p8o8'),
                makeTrainingVideo('module_18', 'Celebrate Small Wins', 'beta_video_203_done', '/portal-onboarding/video-proxy/?file_id=1aJ8iCi3EZHQypaN0QVjojCKXKadRIp_1'),
                makeTrainingVideo('module_18', 'Effective Communication Channels', 'beta_video_204_done', '/portal-onboarding/video-proxy/?file_id=1U2Zu-S4V-ZdISy-KHIvi_83F94MApTmR'),
                makeTrainingVideo('module_18', 'Think Critically', 'beta_video_205_done', '/portal-onboarding/video-proxy/?file_id=11dkHHqoTlA6sLWpcXqvmuF3QA07maHyL'),
                makeTrainingVideo('module_18', 'Sales Success Huddle', 'beta_video_206_done', '/portal-onboarding/video-proxy/?file_id=1-gMrytVOkvPtDekEoGyWdoBbSOf3Mjad'),
                makeTrainingVideo('module_18', 'Music And Beats', 'beta_video_207_done', '/portal-onboarding/video-proxy/?file_id=1mDGuvI5IiazioqwWrL_qrE7yE13Cee54'),
                makeTrainingVideo('module_18', 'Raffle', 'beta_video_208_done', '/portal-onboarding/video-proxy/?file_id=1bMZyCT_mopEhl01v3sgW8v6Mna0P43f0'),
                makeTrainingVideo('module_18', 'Unity Clap', 'beta_video_209_done', '/portal-onboarding/video-proxy/?file_id=1xhDtUJ3w4EXTEPIiDUTWSxdtpOU2uy0N'),
                makeTrainingVideo('module_18', 'Celebrate Closed Deals', 'beta_video_210_done', '/portal-onboarding/video-proxy/?file_id=1-mB7Rc4QOc3-FRVsEUIVX0GqgoxSKSIn')
            ]
        },
        {
            moduleId: 'module_19',
            moduleTitle: 'MODULE 19: FOLLOW UP',
            videos: [
                makeTrainingVideo('module_19', '#1 Rule Of Follow Up', 'beta_video_211_done', '/portal-onboarding/video-proxy/?file_id=1i8OjYcoF4R1RyKfKEfGyJ7yWaUv7Yasj'),
                makeTrainingVideo('module_19', 'Implement Callback Programs', 'beta_video_212_done', '/portal-onboarding/video-proxy/?file_id=1t8OKDkDrkJhL6lNl5F1oJVYPdJl0OISt'),
                makeTrainingVideo('module_19', 'Utilize Texts + Calls', 'beta_video_213_done', '/portal-onboarding/video-proxy/?file_id=1wtdn_ViFg6lWHR7PU0uqaI1XNTwJQIvM'),
                makeTrainingVideo('module_19', 'Email With A Call To Action', 'beta_video_214_done', '/portal-onboarding/video-proxy/?file_id=1ZDQ5TqXb4JiiE5iaAEzIuZvPSPKt_vrN'),
                makeTrainingVideo('module_19', 'Cannot Be Reached', 'beta_video_215_done', '/portal-onboarding/video-proxy/?file_id=1qfiN3s4BmJUDNr6u-NLqZa4g38lXskWP'),
                makeTrainingVideo('module_19', 'Thinking Of You Video', 'beta_video_216_done', '/portal-onboarding/video-proxy/?file_id=1T8_ihAXSKwfaBzK5RnBwaH-sPsiCczTX'),
                makeTrainingVideo('module_19', 'Embrace Unreasonable Persistence', 'beta_video_217_done', '/portal-onboarding/video-proxy/?file_id=1a4KetHV8wVOid2Wu0OUpnHwPjQwTn3aF'),
                makeTrainingVideo('module_19', 'Use Creative Follow-Up Ideas', 'beta_video_218_done', '/portal-onboarding/video-proxy/?file_id=16hnrEhqxug5CYXku-ZYxkj-yjzXtj2pa'),
                makeTrainingVideo('module_19', 'I Saw This And Thought Of You', 'beta_video_219_done', '/portal-onboarding/video-proxy/?file_id=179NQtIdmykAMWQxl7WGW9Oy6tNSQzQ6z'),
                makeTrainingVideo('module_19', 'Personalized Singing Video', 'beta_video_220_done', '/portal-onboarding/video-proxy/?file_id=1OAiKgVYt-dFcOeEfnvI_HIFFj2kcZOd7'),
                makeTrainingVideo('module_19', 'Llc On Facebook', 'beta_video_221_done', '/portal-onboarding/video-proxy/?file_id=18DGcD7nPQzmqIcOMwgDCitD18wnAn6Bz'),
                makeTrainingVideo('module_19', 'Send A Pizza With A Note', 'beta_video_222_done', '/portal-onboarding/video-proxy/?file_id=1kLv9IP5nm0x5SyAX7JBRo03OvGufvS1z'),
                makeTrainingVideo('module_19', 'Photoshop Your Photo Together', 'beta_video_223_done', '/portal-onboarding/video-proxy/?file_id=1xiEQaMBuW9cf3OsCcOps-RnIsuin552E'),
                makeTrainingVideo('module_19', 'Show Them On A Magazine', 'beta_video_224_done', '/portal-onboarding/video-proxy/?file_id=1GIS_3pPOBZE_H9AZZUDrd_gphAaTp1mO'),
                makeTrainingVideo('module_19', 'Add The Circle', 'beta_video_225_done', '/portal-onboarding/video-proxy/?file_id=1eFc7l-NXRf5RmZhfbpBjX6XmsP_X5g0Q'),
                makeTrainingVideo('module_19', 'Follow Up Like You Re On Drugs', 'beta_video_226_done', '/portal-onboarding/video-proxy/?file_id=1WG1xSdLUKyJEN0ZkxCvPyNNFKOisDNdQ'),
                makeTrainingVideo('module_19', 'Demonstrate Interest', 'beta_video_227_done', '/portal-onboarding/video-proxy/?file_id=1R8eLaqCDKTeFPWPW-D3cJ7GUQcjprINC'),
                makeTrainingVideo('module_19', 'Persist In The Face Of Rejection', 'beta_video_228_done', '/portal-onboarding/video-proxy/?file_id=1za3QsOiPRYQOuf6bgIeoE3J-xkOJ7oxS'),
                makeTrainingVideo('module_19', 'Stay Top Of Mind With Newsletter Or Blog', 'beta_video_229_done', '/portal-onboarding/video-proxy/?file_id=1yEJmiSlr1VyP9q2aQAeIpHxmsegUXc7o'),
                makeTrainingVideo('module_19', 'Third Party Baby', 'beta_video_230_done', '/portal-onboarding/video-proxy/?file_id=1XO6rDvG7QpSa9gJxCee9ZVNg8Oxw-2t-')
            ]
        },
        {
            moduleId: 'module_20',
            moduleTitle: 'MODULE 20: MONDAY SALES RALLY ARCHIVE',
            videos: [
                makeTrainingVideo('module_20', 'Monday Sales Rally Recap', 'beta_video_231_done', '/portal-onboarding/video-proxy/?file_id=1gt_zYgtuKs0BQg4kOCo09qSJbZIUVYBZ'),
                makeTrainingVideo('module_20', 'Solving And Serving (Monday Sales Rally Recap)', 'beta_video_232_done', '/portal-onboarding/video-proxy/?file_id=1zUykRrsIh6FFdsEy07gCTq4yu4keB4Xm'),
                makeTrainingVideo('module_20', 'Objection Handling (Monday Sales Rally Recap)', 'beta_video_233_done', '/portal-onboarding/video-proxy/?file_id=1yuw1C4xY1SEROfJ2xP1SadPfNsRKdwp5'),
                makeTrainingVideo('module_20', 'Mastering The Art Of Closing Deals (Monday Sales Rally Recap)', 'beta_video_234_done', '/portal-onboarding/video-proxy/?file_id=15C4ODryAgFOSYR4rJtPaZn5XANGLc4Tu'),
                makeTrainingVideo('module_20', 'Workplace Motivation (Monday Sales Rally Recap)', 'beta_video_235_done', '/portal-onboarding/video-proxy/?file_id=1HQXQALj_Wgos2HSseAN-WDNDkTSK3ZwT'),
                makeTrainingVideo('module_20', 'Success (Monday Sales Rally Recap)', 'beta_video_236_done', '/portal-onboarding/video-proxy/?file_id=1sNYwPcdHTLaeb_RB8fFkFMF9lK-0jTu0'),
                makeTrainingVideo('module_20', 'How To Close A Deal More Effectively (Monday Sales Rally Recap)', 'beta_video_237_done', '/portal-onboarding/video-proxy/?file_id=1m67y16uvQixW_0dALy9K01J0NWmDpuL0')
            ]
        },
        {
            moduleId: 'module_21',
            moduleTitle: 'MODULE 21: FRIDAY LEADERSHIP SESSION ARCHIVE',
            videos: [
                makeTrainingVideo('module_21', 'How To Lead By Example (Friday Leadership Session Recap)', 'beta_video_238_done', '/portal-onboarding/video-proxy/?file_id=1gQVQ4ywKcsL8B8J-KXPoaZEQZeDe6gnc'),
                makeTrainingVideo('module_21', 'Conflict Resolution (Friday Leadership Session Recap)', 'beta_video_239_done', '/portal-onboarding/video-proxy/?file_id=12Ii_hrrqouwpP1uVUD4VpXdBRGP9RIoN')
            ]
        }
    ];

    // TEST OVERRIDE
    var steps = [
        {
            group: 'Welcome and Orientation',
            title: 'Welcome',
            type: 'intro',
            storageKey: 'beta_intro_welcome_done'
        },
        {
            group: 'Welcome and Orientation',
            title: 'Overview',
            type: 'overview',
            storageKey: 'beta_step_company_overview_done'
        },
        {
            group: 'Profile & Credentials',
            title: 'Profile & Identity',
            type: 'form',
            storageKey: 'beta_step_profile_identity_done'
        },
        {
            group: 'Profile & Credentials',
            title: 'Agent Requirements Documents',
            type: 'upload',
            storageKey: 'beta_step_agent_requirements_docs_done'
        }
        ,
        {
            group: 'VIDEO LOOM',
            moduleId: 'video_loom',
            moduleTitle: 'VIDEO LOOM',
            title: 'Terminologies, TCP vs TSP',
            type: 'video',
            storageKey: 'beta_video_module13_1_done',
            durationLabel: '--:--',
            videoSrc: DEV_OVERRIDE_VIDEO_SRC || '/static/images/videoplayback.mp4'
        },
        {
            group: 'VIDEO LOOM',
            moduleId: 'video_loom',
            moduleTitle: 'VIDEO LOOM',
            title: '650 HOMES',
            type: 'video',
            storageKey: 'beta_video_module13_2_done',
            durationLabel: '--:--',
            videoSrc: DEV_OVERRIDE_VIDEO_SRC || '/static/images/videoplayback.mp4'
        },
        {
            group: 'VIDEO LOOM',
            moduleId: 'video_loom',
            moduleTitle: 'VIDEO LOOM',
            title: 'PROFRIENDS',
            type: 'video',
            storageKey: 'beta_video_module13_3_done',
            durationLabel: '--:--',
            videoSrc: DEV_OVERRIDE_VIDEO_SRC || '/static/images/videoplayback.mp4'
        },
        {
            group: 'VIDEO LOOM',
            moduleId: 'video_loom',
            moduleTitle: 'VIDEO LOOM',
            title: 'MY CITIHOMES',
            type: 'video',
            storageKey: 'beta_video_module13_4_done',
            durationLabel: '--:--',
            videoSrc: DEV_OVERRIDE_VIDEO_SRC || '/static/images/videoplayback.mp4'
        },
        {
            group: 'VIDEO LOOM',
            moduleId: 'video_loom',
            moduleTitle: 'VIDEO LOOM',
            title: 'HOMEMARK',
            type: 'video',
            storageKey: 'beta_video_module13_5_done',
            durationLabel: '--:--',
            videoSrc: DEV_OVERRIDE_VIDEO_SRC || '/static/images/videoplayback.mp4'
        }
    ];

    TRAINING_VIDEO_MODULES.forEach(function (moduleDef) {
        (moduleDef.videos || []).forEach(function (video) {
            steps.push({
                group: AGENT_FOUNDATION_GROUP_TITLE,
                moduleId: moduleDef.moduleId || '',
                moduleTitle: moduleDef.moduleTitle,
                title: video.title,
                type: 'video',
                storageKey: video.storageKey,
                durationLabel: video.durationLabel || '--:--',
                videoSrc: DEV_OVERRIDE_VIDEO_SRC || video.videoSrcPath || '/static/images/videoplayback.mp4',
                thumbnailSrc: video.thumbnailSrc || TRAINING_VIDEO_GENERIC_THUMBNAIL,
                contentId: video.contentId
            });
        });
    });

    function formatStepCountLabel(stepCount) {
        var normalizedCount = Number(stepCount);
        if (!Number.isFinite(normalizedCount) || normalizedCount < 0) {
            normalizedCount = 0;
        }
        normalizedCount = Math.floor(normalizedCount);
        return normalizedCount + ' ' + (normalizedCount === 1 ? 'step' : 'steps') + ' total';
    }

    function syncStepCountLabels() {
        var label = formatStepCountLabel(steps.length);
        if (stepCountBadgeEl) {
            stepCountBadgeEl.textContent = label;
        }
        return label;
    }

    function formatStepsLeftLabel(remainingCount) {
        var normalizedCount = Number(remainingCount);
        if (!Number.isFinite(normalizedCount) || normalizedCount < 0) {
            normalizedCount = 0;
        }
        normalizedCount = Math.floor(normalizedCount);
        return normalizedCount + ' ' + (normalizedCount === 1 ? 'step' : 'steps') + ' left';
    }

    syncStepCountLabels();

    var completed = new Set();
    var current = 0;
    var openGroups = new Set();
    var openTrainingModules = new Set();
    var selectedTrainingModuleId = '';
    var trainingModuleCommentStateById = {};
    var videoByStepIndex = {};
    var _pendingSave = null;
    var activationInProgress = false;
    var activationCompletedInSession = false;
    var agentFoundationCompletionEmailInFlight = false;
    var agentFoundationCompletionEmailTriggered = false;
    var showCongratsPanel = false;
    var activationStatusMessage = '';
    var activationStatusTone = '';
    var lastModulesCompletedNotified = -1;
    var isMobileSheetOpen = false;
    var mobileLayoutQuery = window.matchMedia('(max-width: 900px)');

    function normalizeStorageKeySegment(value, fallback) {
        var normalized = String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
        if (normalized) return normalized;
        return String(fallback || 'anonymous');
    }

    var currentUserId = String(root.getAttribute('data-user-id') || '').trim();
    var currentUserEmail = String(root.getAttribute('data-account-email') || '').trim();
    var progressStorageSeed = '';

    if (currentUserId) {
        progressStorageSeed = 'uid_' + normalizeStorageKeySegment(currentUserId, 'anonymous');
    } else if (currentUserEmail) {
        progressStorageSeed = 'mail_' + normalizeStorageKeySegment(currentUserEmail, 'anonymous');
    } else {
        progressStorageSeed = 'name_' + normalizeStorageKeySegment(currentUserName, 'anonymous');
    }

    var progressStorageKey = 'beta_progress_' + progressStorageSeed;
    var viewStateStorageKey = progressStorageKey + '__view_state';
    var sidebarStateStorageKey = progressStorageKey + '__sidebar_state';
    var videoQuizStorageKey = progressStorageKey + '__video_quiz_state';
    var quizStateByStorageKey = {};
    var quizFallbackTemplateCache = '';
    var videoQuizStateByStorageKey = {};
    var activeVideoQuizStepIndex = null;
    var activeVideoQuizOnPassed = null;
    var videoQuizModalWired = false;
    var ENFORCE_NON_SKIPPABLE_VIDEOS = true;
    var VIDEO_QUIZ_PASS_PERCENT = 80;
    var VIDEO_QUIZ_QUESTIONS_PER_VIDEO = 5;
    var VIDEO_WATCH_COMPLETE_THRESHOLD = 99.5;
    var certificateSessionSeed = String(Date.now());
    var completionCertificateMeta = {
        sentAt: '',
        certificateId: '',
        recipientEmail: (root.getAttribute('data-account-email') || '').trim() || '',
        emailBackend: '',
        lastEmailError: '',
        programTitle: (root.getAttribute('data-cert-program-title') || 'Employee Onboarding Program').trim() || 'Employee Onboarding Program',
        description: (root.getAttribute('data-cert-description') || 'Has successfully completed the Employee Onboarding Program.').trim() || 'Has successfully completed the Employee Onboarding Program.',
        templateImageUrl: (root.getAttribute('data-cert-template-url') || '/static/images/Certificate_completion.png').trim() || '/static/images/Certificate_completion.png',
        issuedBy: (root.getAttribute('data-cert-issued-by') || 'Gabriel V. Libacao Jr.').trim() || 'Gabriel V. Libacao Jr.',
        issuedTitle: (root.getAttribute('data-cert-issued-title') || 'CEO / Founder').trim() || 'CEO / Founder',
        logoUrl: (root.getAttribute('data-cert-logo-url') || '/static/images/innersparc.png').trim() || '/static/images/innersparc.png'
    };
    // Holds the most recent server payload returned from completing a step.
    var _lastStepCompletePayload = null;

    function tpl1Footer(noteHtml, prevBtnHtml, nextBtnHtml) {
        return '<footer class="tpl1-foot"><span class="tpl1-note">' + (noteHtml || '') + '</span><div class="tpl1-controls">' + (prevBtnHtml || '') + (nextBtnHtml || '') + '</div></footer>';
    }

    for (var s = 0; s < steps.length; s += 1) {
        if (steps[s].videoSrc) {
            videoByStepIndex[s] = steps[s].videoSrc;
        }
    }

    function formatDurationLabel(totalSeconds) {
        var safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
        if (!safeSeconds) return 'Preview';
        var minutes = Math.floor(safeSeconds / 60);
        var seconds = safeSeconds % 60;
        return String(minutes) + ':' + String(seconds).padStart(2, '0');
    }

    function readTrainingDurationCache() {
        try {
            var raw = localStorage.getItem(TRAINING_DURATION_CACHE_KEY);
            if (!raw) return {};
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
            return parsed;
        } catch (e) {
            return {};
        }
    }

    function writeTrainingDurationCache(cacheObj) {
        try {
            localStorage.setItem(TRAINING_DURATION_CACHE_KEY, JSON.stringify(cacheObj || {}));
        } catch (e) {
            // Ignore storage quota/privacy errors.
        }
    }

    function getStepVideoSource(step) {
        if (!step) return '';
        if (step.contentId) {
            var contentEl = document.getElementById(step.contentId);
            if (contentEl) {
                var dataSrc = (contentEl.getAttribute('data-video-src') || '').trim();
                if (dataSrc) return dataSrc;
            }
        }
        return String(step.videoSrc || '').trim();
    }

    function updateTrainingCardDurationLabel(stepIndex, label) {
        if (!panelEl) return;
        var durationEl = panelEl.querySelector('[data-training-card="' + stepIndex + '"] .tpl1-training-duration');
        if (durationEl) {
            durationEl.textContent = label;
        }
    }

    function seedStepDurationsFromCache() {
        var cache = readTrainingDurationCache();
        for (var i = 0; i < steps.length; i += 1) {
            var step = steps[i];
            if (!step || step.type !== 'video') continue;
            var src = getStepVideoSource(step);
            if (!src) continue;
            var cached = cache[src];
            if (typeof cached === 'string' && /^\d+:\d{2}$/.test(cached)) {
                step.durationLabel = cached;
            }
        }
    }

    function probeStepDuration(stepIndex) {
        var step = steps[stepIndex];
        if (!step || step.type !== 'video') return;
        if (step.durationLabel && step.durationLabel !== '--:--' && step.durationLabel !== 'Preview') return;
        if (step._durationProbeStarted) return;

        var videoSrc = getStepVideoSource(step);
        if (!videoSrc) return;

        step._durationProbeStarted = true;

        var probe = document.createElement('video');
        probe.preload = 'metadata';
        probe.muted = true;
        probe.src = videoSrc;

        probe.addEventListener('loadedmetadata', function () {
            var label = formatDurationLabel(probe.duration);
            step.durationLabel = label;
            updateTrainingCardDurationLabel(stepIndex, label);

            var cache = readTrainingDurationCache();
            cache[videoSrc] = label;
            writeTrainingDurationCache(cache);

            probe.removeAttribute('src');
            probe.load();
        }, { once: true });

        probe.addEventListener('error', function () {
            step.durationLabel = step.durationLabel && step.durationLabel !== '--:--' ? step.durationLabel : 'Preview';
            updateTrainingCardDurationLabel(stepIndex, step.durationLabel);
            probe.removeAttribute('src');
            probe.load();
        }, { once: true });
    }

    function hydrateTrainingDurationPreview() {
        for (var i = 0; i < steps.length; i += 1) {
            // Avoid probing Video Loom steps to prevent auto-buffering on page load.
            if (steps[i] && steps[i].type === 'video' && String(steps[i].group || '').toUpperCase() !== 'VIDEO LOOM') {
                probeStepDuration(i);
            }
        }
    }

    function getCookie(name) {
        var cookieString = document.cookie || '';
        var cookies = cookieString ? cookieString.split(';') : [];
        for (var i = 0; i < cookies.length; i += 1) {
            var cookie = cookies[i].trim();
            if (cookie.indexOf(name + '=') === 0) {
                return decodeURIComponent(cookie.slice(name.length + 1));
            }
        }
        return '';
    }

    function getPreferredThemeName() {
        try {
            var stored = localStorage.getItem(THEME_STORAGE_KEY);
            if (stored === 'light' || stored === 'dark') {
                return stored;
            }
        } catch (e) {
            // Ignore storage errors and use light as default.
        }

        // Default onboarding dashboard theme is light.
        return 'light';
    }

    function applyThemeName(themeName) {
        var name = themeName === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', name);

        if (themeBtn) {
            var isDark = name === 'dark';
            themeBtn.setAttribute('aria-pressed', String(isDark));
            themeBtn.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
            themeBtn.setAttribute('aria-label', isDark ? 'Enable light mode' : 'Enable dark mode');
        }
    }

    function initThemePreference() {
        applyThemeName(getPreferredThemeName());
    }

    function toggleThemePreference() {
        var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        var next = current === 'dark' ? 'light' : 'dark';
        applyThemeName(next);
        try {
            localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch (e) {
            // Ignore storage errors; theme still applies for the current session.
        }
    }

    function getCsrfTokenFallback() {
        var cookie = getCookie('csrftoken');
        if (cookie) return cookie;
        var el = document.querySelector('.tpl1-hidden-form input[name="csrfmiddlewaretoken"]');
        return el ? el.value : '';
    }

    function stripNonDigits(value) {
        return String(value || '').replace(/\D+/g, '');
    }

    function normalizePhoneInputValue(rawValue, country) {
        var digits = stripNonDigits(rawValue);
        var dialCode = String(country || '').replace('+', '');

        if (dialCode && digits.indexOf(dialCode) === 0) {
            digits = digits.slice(dialCode.length);
        }
        if (digits.length === 11 && digits.charAt(0) === '0') {
            digits = digits.slice(1);
        }

        return digits.slice(0, 10);
    }

    function getDialCodeFromControl(controlId) {
        var el = document.getElementById(controlId);
        if (el && el.tagName === 'SELECT') {
            return el.value || '+63';
        }
        if (el && el.classList && el.classList.contains('tpl1-phone-unified')) {
            return el.getAttribute('data-selected-dial') || el.getAttribute('data-default-dial') || '+63';
        }
        if (controlId === 'tpl1AccountCountry') {
            var accountUnified = document.getElementById('tpl1PhoneUnified');
            if (accountUnified) {
                return accountUnified.getAttribute('data-selected-dial') || accountUnified.getAttribute('data-default-dial') || '+63';
            }
        }
        if (controlId === 'betaPhoneCountry') {
            var betaUnified = document.getElementById('betaPhoneUnified');
            if (betaUnified) {
                return betaUnified.getAttribute('data-selected-dial') || betaUnified.getAttribute('data-default-dial') || '+63';
            }
        }
        return '+63';
    }

    function normalizeAndValidatePH(countrySelectId, phoneInputId) {
        var country = getDialCodeFromControl(countrySelectId);
        var raw = (document.getElementById(phoneInputId) || {}).value || '';
        var digits = normalizePhoneInputValue(raw, country);

        if (country === '+63' && (digits.length !== 10 || digits.charAt(0) !== '9')) {
            return {
                valid: false,
                international: '',
                local: '',
                message: 'Please enter a valid Philippine mobile number (9XXXXXXXXX).'
            };
        }

        if (!digits.length) {
            return {
                valid: false,
                international: '',
                local: '',
                message: 'Please enter a mobile number.'
            };
        }

        return {
            valid: true,
            international: country + digits,
            local: digits,
            message: ''
        };
    }

    function enforcePhoneInputSanitization(phoneInputId, countryControlId) {
        var input = document.getElementById(phoneInputId);
        if (!input) return;

        input.setAttribute('maxlength', '10');
        input.setAttribute('inputmode', 'numeric');
        input.setAttribute('autocomplete', 'tel-national');

        var applySanitizedValue = function () {
            var country = getDialCodeFromControl(countryControlId);
            var sanitized = normalizePhoneInputValue(input.value, country);
            if (input.value !== sanitized) {
                input.value = sanitized;
            }
        };

        input.addEventListener('input', applySanitizedValue);
        input.addEventListener('change', applySanitizedValue);
        input.addEventListener('blur', applySanitizedValue);
        input.addEventListener('paste', function (event) {
            var text = '';
            if (event.clipboardData && typeof event.clipboardData.getData === 'function') {
                text = event.clipboardData.getData('text') || '';
            } else if (window.clipboardData && typeof window.clipboardData.getData === 'function') {
                text = window.clipboardData.getData('Text') || '';
            }
            if (!text) {
                window.setTimeout(applySanitizedValue, 0);
                return;
            }
            event.preventDefault();
            var country = getDialCodeFromControl(countryControlId);
            input.value = normalizePhoneInputValue(text, country);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });

        var countryContainer = document.getElementById(countryControlId);
        if (countryContainer && !countryContainer.dataset.phoneSanitizeWired) {
            countryContainer.addEventListener('countrychange', applySanitizedValue);
            countryContainer.dataset.phoneSanitizeWired = '1';
        }

        applySanitizedValue();
    }

    function prettyApiError(payload, defaultMsg) {
        if (!payload) return defaultMsg || 'Unable to save changes.';
        if (payload.field_errors && payload.field_errors.phone_number) {
            var phoneError = payload.field_errors.phone_number;
            if (Array.isArray(phoneError) && phoneError.length) return String(phoneError[0]);
            if (typeof phoneError === 'string') return phoneError;
        }
        if (payload.message) return String(payload.message);
        return defaultMsg || 'Unable to save changes.';
    }

    function showInlineError(elId, message) {
        var el = document.getElementById(elId);
        if (!el) return;
        el.textContent = message || '';
        el.classList.add('show');
        el.setAttribute('role', 'alert');
    }

    function clearInlineError(elId) {
        var el = document.getElementById(elId);
        if (!el) return;
        el.textContent = '';
        el.classList.remove('show');
        el.removeAttribute('role');
    }

    function getFullPhoneFromControls(countrySelectId, phoneInputId) {
        var normalized = normalizeAndValidatePH(countrySelectId, phoneInputId);
        if (normalized.valid) return normalized.international;
        return '';
    }

    function openPanel(panelEl, anchorEl, options) {
        if (!panelEl || !anchorEl) {
            return function () {};
        }

        options = options || {};
        var originalParent = panelEl.parentNode;
        var margin = typeof options.margin === 'number' ? options.margin : 8;
        var offsetY = typeof options.offsetY === 'number' ? options.offsetY : 8;
        var minWidth = typeof options.minWidth === 'number' ? options.minWidth : 240;
        var stickToBottom = options.stickToBottom === true;
        var closeOnScroll = options.closeOnScroll !== false;

        // Move dropdown panel to body so parent overflow does not clip it.
        if (panelEl.parentNode !== document.body) {
            document.body.appendChild(panelEl);
        }

        // Preserve tpl1 theme tokens after teleporting the panel to document.body.
        var themeSource = null;
        if (anchorEl && typeof anchorEl.closest === 'function') {
            themeSource = anchorEl.closest('.tpl1');
        }
        if (!themeSource) {
            themeSource = anchorEl;
        }
        var themeStyles = window.getComputedStyle(themeSource);
        [
            '--primary-accent',
            '--hover-bg',
            '--text',
            '--muted',
            '--line',
            '--field-bg',
            '--field-border',
            '--focus-ring',
            '--panel-bg',
            '--shadow',
            '--dropdown-option-hover',
            '--dropdown-option-active',
            '--dropdown-option-text',
            '--dropdown-panel-bg',
            '--dropdown-panel-border'
        ].forEach(function (token) {
            var value = themeStyles.getPropertyValue(token);
            if (value) {
                panelEl.style.setProperty(token, value.trim());
            }
        });

        function positionPanel() {
            var anchorRect = anchorEl.getBoundingClientRect();
            var viewportWidth = window.innerWidth;
            var viewportHeight = window.innerHeight;

            var desiredWidth = Math.max(anchorRect.width, minWidth);
            panelEl.style.minWidth = Math.round(desiredWidth) + 'px';
            panelEl.style.maxWidth = Math.max(220, viewportWidth - margin * 2) + 'px';

            var panelRect = panelEl.getBoundingClientRect();
            var panelWidth = panelRect.width || desiredWidth;
            var panelHeight = panelRect.height || 260;

            var left = anchorRect.left;
            if (left + panelWidth > viewportWidth - margin) {
                left = viewportWidth - panelWidth - margin;
            }
            if (left < margin) {
                left = margin;
            }

            var belowTop = anchorRect.bottom + offsetY;
            var top = belowTop;

            if (stickToBottom) {
                var availableBelow = viewportHeight - margin - belowTop;
                var maxPanelHeight = Math.max(120, availableBelow);
                panelEl.style.maxHeight = Math.round(maxPanelHeight) + 'px';
                panelEl.style.overflowY = 'auto';
            } else {
                panelEl.style.overflowY = '';
                var aboveTop = anchorRect.top - panelHeight - offsetY;
                var fitsBelow = belowTop + panelHeight <= viewportHeight - margin;
                top = fitsBelow ? belowTop : aboveTop;

                if (top < margin) {
                    top = margin;
                }
                if (top + panelHeight > viewportHeight - margin) {
                    top = Math.max(margin, viewportHeight - panelHeight - margin);
                }
            }

            panelEl.style.left = Math.round(left) + 'px';
            panelEl.style.top = Math.round(top) + 'px';
        }

        panelEl.classList.add('is-open');
        panelEl.setAttribute('aria-hidden', 'false');
        positionPanel();

        function onDocumentPointer(event) {
            if (typeof options.onRequestClose !== 'function') return;
            var target = event.target;
            if (!target) return;
            if (panelEl.contains(target) || anchorEl.contains(target)) return;
            options.onRequestClose();
        }

        function onDocumentEscape(event) {
            if (typeof options.onRequestClose !== 'function') return;
            if (event.key === 'Escape') {
                options.onRequestClose();
            }
        }

        document.addEventListener('click', onDocumentPointer, false);
        document.addEventListener('touchend', onDocumentPointer, false);
        document.addEventListener('keydown', onDocumentEscape, true);

        function onViewportChange(evt) {
            if (evt && evt.type === 'scroll') {
                if (closeOnScroll) {
                    if (typeof options.onRequestClose === 'function') {
                        options.onRequestClose();
                        return;
                    }
                } else {
                    positionPanel();
                    return;
                }
            } else if (evt && evt.type === 'resize') {
                positionPanel();
                return;
            }

            positionPanel();
        }

        function close() {
            panelEl.classList.remove('is-open');
            panelEl.setAttribute('aria-hidden', 'true');
            panelEl.style.left = '';
            panelEl.style.top = '';
            panelEl.style.minWidth = '';
            panelEl.style.maxWidth = '';
            panelEl.style.maxHeight = '';
            panelEl.style.overflowY = '';

            if (originalParent && panelEl.parentNode !== originalParent) {
                originalParent.appendChild(panelEl);
            }

            window.removeEventListener('resize', onViewportChange);
            window.removeEventListener('scroll', onViewportChange, true);
            document.removeEventListener('click', onDocumentPointer, false);
            document.removeEventListener('touchend', onDocumentPointer, false);
            document.removeEventListener('keydown', onDocumentEscape, true);
        }

        window.addEventListener('resize', onViewportChange);
        window.addEventListener('scroll', onViewportChange, true);

        return close;
    }

    function wireUnifiedPhoneDropdown(containerId, buttonId, listId) {
        var container = document.getElementById(containerId);
        var button = document.getElementById(buttonId);
        var list = document.getElementById(listId);
        if (!container || !button || !list) return;
        if (container.dataset.phoneUnifiedWired === '1') return;

        var closeFloatingList = null;

        var flagEl = container.querySelector('.tpl1-flag');
        var codeEl = container.querySelector('.tpl1-code');

        function allOptions() {
            return Array.prototype.slice.call(list.querySelectorAll('.country-option'));
        }

        function selectedOption() {
            var selected = list.querySelector('.country-option[aria-selected="true"]');
            if (selected) return selected;
            var opts = allOptions();
            return opts.length ? opts[0] : null;
        }

        function applyOption(optionEl) {
            if (!optionEl) return;
            allOptions().forEach(function (opt) {
                opt.setAttribute('aria-selected', opt === optionEl ? 'true' : 'false');
                opt.classList.toggle('selected', opt === optionEl);
            });
            var flag = optionEl.querySelector('.flag');
            var dial = optionEl.getAttribute('data-code') || '+63';
            if (flagEl && flag) {
                flagEl.textContent = flag.textContent || '';
            }
            if (codeEl) {
                codeEl.textContent = dial;
            }
            container.setAttribute('data-selected-dial', dial);
            container.dispatchEvent(new CustomEvent('countrychange', { bubbles: true, detail: { dial: dial } }));
        }

        function openList() {
            button.setAttribute('aria-expanded', 'true');
            container.classList.add('is-open');
            container.classList.add('is-focused');
            if (typeof closeFloatingList === 'function') {
                closeFloatingList();
            }
            closeFloatingList = openPanel(list, container, {
                minWidth: 260,
                offsetY: 6,
                margin: 8,
                onRequestClose: function () {
                    closeList(false);
                }
            });
            var selected = selectedOption();
            if (selected) selected.focus();
        }

        function closeList(focusButton) {
            button.setAttribute('aria-expanded', 'false');
            if (typeof closeFloatingList === 'function') {
                closeFloatingList();
            }
            closeFloatingList = null;
            list.setAttribute('aria-hidden', 'true');
            container.classList.remove('is-open');
            if (focusButton) {
                button.focus();
            }
        }

        function moveOptionFocus(step) {
            var opts = allOptions();
            if (!opts.length) return;
            var idx = opts.indexOf(document.activeElement);
            if (idx < 0) {
                idx = opts.indexOf(selectedOption());
            }
            var nextIdx = (idx + step + opts.length) % opts.length;
            opts[nextIdx].focus();
        }

        var initialDial = container.getAttribute('data-selected-dial') || container.getAttribute('data-default-dial') || '+63';
        var initialOption = allOptions().find(function (opt) {
            return (opt.getAttribute('data-code') || '') === initialDial;
        }) || selectedOption();
        applyOption(initialOption);

        button.addEventListener('click', function () {
            var expanded = button.getAttribute('aria-expanded') === 'true';
            if (expanded) {
                closeList(false);
            } else {
                openList();
            }
        });

        button.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openList();
            }
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                openList();
            }
        });

        allOptions().forEach(function (optionEl) {
            optionEl.addEventListener('click', function () {
                applyOption(optionEl);
                closeList(true);
            });

            optionEl.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    applyOption(optionEl);
                    closeList(true);
                }
            });
        });

        list.addEventListener('keydown', function (event) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                moveOptionFocus(1);
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                moveOptionFocus(-1);
            }
            if (event.key === 'Home') {
                event.preventDefault();
                var opts = allOptions();
                if (opts.length) opts[0].focus();
            }
            if (event.key === 'End') {
                event.preventDefault();
                var options = allOptions();
                if (options.length) options[options.length - 1].focus();
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                closeList(true);
            }
        });

        container.addEventListener('focusout', function () {
            window.setTimeout(function () {
                if (!container.contains(document.activeElement) && !list.contains(document.activeElement)) {
                    closeList(false);
                    container.classList.remove('is-focused');
                    container.classList.remove('focus-within');
                }
            }, 0);
        });

        container.addEventListener('focusin', function () {
            container.classList.add('is-focused');
            container.classList.add('focus-within');
        });

        container.dataset.phoneUnifiedWired = '1';
    }

    function initPhoneControls() {
        wireUnifiedPhoneDropdown('tpl1PhoneUnified', 'tpl1PhoneCountryBtn', 'tpl1PhoneCountryList');
        wireUnifiedPhoneDropdown('betaPhoneUnified', 'betaPhoneCountryBtn', 'betaPhoneCountryList');

        enforcePhoneInputSanitization('betaPrimaryPhone', 'betaPhoneUnified');
        enforcePhoneInputSanitization('tpl1AccountPhone', 'tpl1PhoneUnified');

        var betaPhone = document.getElementById('betaPrimaryPhone');
        if (betaPhone && !betaPhone.value) {
            betaPhone.placeholder = '9XXXXXXXXX';
        }

        var tplPhone = document.getElementById('tpl1AccountPhone');
        if (tplPhone && !tplPhone.value) {
            tplPhone.placeholder = '9XXXXXXXXX';
        }

        (function wirePhoneFocus() {
            var containers = document.querySelectorAll('.tpl1-phone-unified');
            containers.forEach(function (container) {
                if (!container || container.dataset.focusWired === '1') return;
                var input = container.querySelector('.tpl1-phone-input') || container.querySelector('input') || container.querySelector('select');
                var btn = container.querySelector('.tpl1-phone-country');

                function set(on) {
                    container.classList.toggle('is-focused', !!on);
                }

                function clearIfOutside() {
                    window.setTimeout(function () {
                        if (!container.contains(document.activeElement)) {
                            set(false);
                        }
                    }, 0);
                }

                if (input) {
                    input.addEventListener('focus', function () { set(true); });
                    input.addEventListener('blur', clearIfOutside);
                }
                if (btn) {
                    btn.addEventListener('focus', function () { set(true); });
                    btn.addEventListener('blur', clearIfOutside);
                }

                container.addEventListener('focusin', function () { set(true); });
                container.addEventListener('focusout', clearIfOutside);
                container.dataset.focusWired = '1';
            });
        })();
    }

    function parseBirthdateDisplayToIso(raw) {
        var value = String(raw || '').trim();
        if (!value) return '';

        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            var isoParts = value.split('-');
            var isoYear = Number(isoParts[0]);
            var isoMonth = Number(isoParts[1]);
            var isoDay = Number(isoParts[2]);
            if (!isoYear || isoMonth < 1 || isoMonth > 12 || isoDay < 1 || isoDay > 31) return '';

            var isoCandidate = new Date(isoYear, isoMonth - 1, isoDay);
            if (
                isoCandidate.getFullYear() !== isoYear ||
                isoCandidate.getMonth() !== isoMonth - 1 ||
                isoCandidate.getDate() !== isoDay
            ) {
                return '';
            }

            var isoNow = new Date();
            var isoToday = new Date(isoNow.getFullYear(), isoNow.getMonth(), isoNow.getDate());
            if (isoCandidate > isoToday) return '';
            if (isoCandidate.getFullYear() < 1900) return '';
            return value;
        }

        var parsed = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!parsed) return '';

        var month = Number(parsed[1]);
        var day = Number(parsed[2]);
        var year = Number(parsed[3]);
        if (!year || month < 1 || month > 12 || day < 1 || day > 31) return '';

        var candidate = new Date(year, month - 1, day);
        if (
            candidate.getFullYear() !== year ||
            candidate.getMonth() !== month - 1 ||
            candidate.getDate() !== day
        ) {
            return '';
        }

        var now = new Date();
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (candidate > today) return '';
        if (candidate.getFullYear() < 1900) return '';

        var monthStr = String(month).padStart(2, '0');
        var dayStr = String(day).padStart(2, '0');
        return String(year) + '-' + monthStr + '-' + dayStr;
    }

    function wireProfileIdentityPremiumControls() {
        var genderControl = document.getElementById('betaGenderControl');
        var genderHidden = document.getElementById('betaGender');
        var genderTrigger = document.getElementById('betaGenderTrigger');
        var genderValue = document.getElementById('betaGenderValue');
        var genderList = document.getElementById('betaGenderList');

        var birthdateWrap = document.querySelector('.birthdate-input-wrap');
        var birthdateInput = document.getElementById('betaBirthdate');
        var birthdatePanel = document.getElementById('betaBirthdatePanel');
        var birthdateMonth = document.getElementById('betaBirthdateMonth');
        var birthdateYear = document.getElementById('betaBirthdateYear');
        var birthdateGrid = document.getElementById('betaBirthdateGrid');
        var birthdatePrev = document.getElementById('betaBirthdatePrev');
        var birthdateNext = document.getElementById('betaBirthdateNext');
        var birthdateTrigger = document.getElementById('betaBirthdateTrigger');
        var birthdateMonthTrigger = document.getElementById('betaBirthdateMonthTrigger');
        var birthdateYearTrigger = document.getElementById('betaBirthdateYearTrigger');
        var birthdateMonthValue = document.getElementById('betaBirthdateMonthValue');
        var birthdateYearValue = document.getElementById('betaBirthdateYearValue');
        var birthdateMonthList = document.getElementById('betaBirthdateMonthList');
        var birthdateYearList = document.getElementById('betaBirthdateYearList');

        function wireFocusClass(containerEl, focusTargets) {
            if (!containerEl || !focusTargets || !focusTargets.length) return;

            function setFocused(on) {
                containerEl.classList.toggle('is-focused', Boolean(on));
            }

            function clearIfOutside() {
                window.setTimeout(function () {
                    if (!containerEl.contains(document.activeElement)) {
                        setFocused(false);
                    }
                }, 0);
            }

            focusTargets.forEach(function (target) {
                if (!target) return;
                target.addEventListener('focus', function () { setFocused(true); });
                target.addEventListener('blur', clearIfOutside);
            });

            containerEl.addEventListener('focusin', function () { setFocused(true); });
            containerEl.addEventListener('focusout', clearIfOutside);
        }

        wireFocusClass(genderControl, [genderTrigger]);
        wireFocusClass(birthdateWrap, [birthdateInput, birthdateTrigger]);

        if (genderControl && genderHidden && genderTrigger && genderValue && genderList) {
            var closeGenderFloating = null;

            function allGenderOptions() {
                return Array.prototype.slice.call(genderList.querySelectorAll('.gender-option'));
            }

            function selectedGenderOption() {
                var selected = genderList.querySelector('.gender-option[aria-selected="true"]');
                if (selected) return selected;
                var options = allGenderOptions();
                return options.length ? options[0] : null;
            }

            function genderLabel(value) {
                if (value === 'male') return 'Male';
                if (value === 'female') return 'Female';
                if (value === 'prefer_not_to_say') return 'Prefer not to say';
                return 'Select gender';
            }

            function setGender(value) {
                var next = String(value || '').trim();
                genderHidden.value = next;
                genderValue.textContent = genderLabel(next);
                allGenderOptions().forEach(function (opt) {
                    var selected = (opt.getAttribute('data-value') || '') === next;
                    opt.setAttribute('aria-selected', selected ? 'true' : 'false');
                    opt.classList.toggle('selected', selected);
                });
                genderHidden.dispatchEvent(new Event('input', { bubbles: true }));
                genderHidden.dispatchEvent(new Event('change', { bubbles: true }));
            }

            function closeGender(focusTrigger) {
                if (typeof closeGenderFloating === 'function') {
                    closeGenderFloating();
                }
                closeGenderFloating = null;
                genderControl.classList.remove('is-open');
                genderTrigger.setAttribute('aria-expanded', 'false');
                genderList.setAttribute('aria-hidden', 'true');
                if (focusTrigger) {
                    genderTrigger.focus();
                }
            }

            function openGender() {
                genderControl.classList.add('is-open');
                genderControl.classList.add('is-focused');
                genderTrigger.setAttribute('aria-expanded', 'true');
                if (typeof closeGenderFloating === 'function') {
                    closeGenderFloating();
                }
                closeGenderFloating = openPanel(genderList, genderControl, {
                    minWidth: 240,
                    offsetY: 8,
                    margin: 8,
                    onRequestClose: function () {
                        closeGender(false);
                    }
                });
                var selected = selectedGenderOption();
                if (selected) selected.focus();
            }

            function moveGenderFocus(step) {
                var options = allGenderOptions();
                if (!options.length) return;
                var idx = options.indexOf(document.activeElement);
                if (idx < 0) {
                    idx = options.indexOf(selectedGenderOption());
                }
                var nextIdx = (idx + step + options.length) % options.length;
                options[nextIdx].focus();
            }

            setGender(genderHidden.value || '');

            genderTrigger.addEventListener('click', function () {
                if (genderTrigger.getAttribute('aria-expanded') === 'true') {
                    closeGender(false);
                } else {
                    openGender();
                }
            });

            genderTrigger.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openGender();
                }
                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    openGender();
                }
                if (event.key === 'Escape') {
                    event.preventDefault();
                    closeGender(false);
                }
            });

            allGenderOptions().forEach(function (optionEl) {
                optionEl.addEventListener('click', function () {
                    setGender(optionEl.getAttribute('data-value') || '');
                    closeGender(true);
                });

                optionEl.addEventListener('keydown', function (event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setGender(optionEl.getAttribute('data-value') || '');
                        closeGender(true);
                    }
                });
            });

            genderList.addEventListener('keydown', function (event) {
                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    moveGenderFocus(1);
                }
                if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    moveGenderFocus(-1);
                }
                if (event.key === 'Home') {
                    event.preventDefault();
                    var options = allGenderOptions();
                    if (options.length) options[0].focus();
                }
                if (event.key === 'End') {
                    event.preventDefault();
                    var listOptions = allGenderOptions();
                    if (listOptions.length) listOptions[listOptions.length - 1].focus();
                }
                if (event.key === 'Escape') {
                    event.preventDefault();
                    closeGender(true);
                }
            });
        }

        if (
            birthdateWrap && birthdateInput && birthdatePanel &&
            birthdateMonth && birthdateYear && birthdateGrid && birthdatePrev && birthdateNext &&
            birthdateMonthTrigger && birthdateYearTrigger && birthdateMonthValue && birthdateYearValue &&
            birthdateMonthList && birthdateYearList
        ) {
            var closeBirthdateFloating = null;
            var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            var today = new Date();
            var maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            var minDate = new Date(1900, 0, 1);
            var viewYear = today.getFullYear();
            var viewMonth = today.getMonth();
            var closeBirthdateMonthFloating = null;
            var closeBirthdateYearFloating = null;

            function listOptions(listEl) {
                return Array.prototype.slice.call(listEl.querySelectorAll('.birthdate-list-option'));
            }

            function closeMonthList(focusTrigger) {
                if (typeof closeBirthdateMonthFloating === 'function') {
                    closeBirthdateMonthFloating();
                }
                closeBirthdateMonthFloating = null;
                birthdateMonthTrigger.setAttribute('aria-expanded', 'false');
                birthdateMonthList.setAttribute('aria-hidden', 'true');
                if (focusTrigger) {
                    birthdateMonthTrigger.focus();
                }
            }

            function closeYearList(focusTrigger) {
                if (typeof closeBirthdateYearFloating === 'function') {
                    closeBirthdateYearFloating();
                }
                closeBirthdateYearFloating = null;
                birthdateYearTrigger.setAttribute('aria-expanded', 'false');
                birthdateYearList.setAttribute('aria-hidden', 'true');
                if (focusTrigger) {
                    birthdateYearTrigger.focus();
                }
            }

            function closeJumpLists(focusTrigger) {
                closeMonthList(focusTrigger);
                closeYearList(false);
            }

            function focusSelectedOrFirst(listEl, fallbackToLast) {
                var options = listOptions(listEl);
                if (!options.length) return;
                var selected = listEl.querySelector('.birthdate-list-option[aria-selected="true"]');
                var target = selected || (fallbackToLast ? options[options.length - 1] : options[0]);
                if (target) {
                    target.focus();
                }
            }

            function focusRelativeOption(listEl, step) {
                var options = listOptions(listEl);
                if (!options.length) return;
                var idx = options.indexOf(document.activeElement);
                if (idx < 0) {
                    var selected = listEl.querySelector('.birthdate-list-option[aria-selected="true"]');
                    idx = selected ? options.indexOf(selected) : 0;
                }
                var nextIdx = idx + step;
                if (nextIdx < 0) nextIdx = 0;
                if (nextIdx > options.length - 1) nextIdx = options.length - 1;
                options[nextIdx].focus();
            }

            function isoFromDate(dateObj) {
                return String(dateObj.getFullYear()) + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
            }

            function displayFromIso(iso) {
                var parts = String(iso || '').split('-');
                if (parts.length !== 3) return '';
                return parts[1] + '/' + parts[2] + '/' + parts[0];
            }

            function parseIso(iso) {
                var value = String(iso || '').trim();
                if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
                var parts = value.split('-');
                var dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                if (isoFromDate(dateObj) !== value) return null;
                return dateObj;
            }

            function selectedIso() {
                return parseBirthdateDisplayToIso((birthdateInput.value || '').trim());
            }

            function setBirthdateIso(iso) {
                birthdateInput.value = displayFromIso(iso);
                birthdateInput.dispatchEvent(new Event('input', { bubbles: true }));
                birthdateInput.dispatchEvent(new Event('change', { bubbles: true }));
            }

            function updateJumpLabels() {
                var monthIndex = Number(viewMonth);
                if (monthIndex < 0 || monthIndex > 11 || Number.isNaN(monthIndex)) {
                    monthIndex = 0;
                }
                birthdateMonthValue.textContent = monthNames[monthIndex] || monthNames[0];
                birthdateYearValue.textContent = String(viewYear);
            }

            function syncListSelection(listEl, selectedValue) {
                if (!listEl) return;
                var options = Array.prototype.slice.call(listEl.querySelectorAll('.birthdate-list-option'));
                var selectedOption = null;
                options.forEach(function (optionEl) {
                    var isSelected = String(optionEl.getAttribute('data-value') || '') === String(selectedValue);
                    optionEl.setAttribute('aria-selected', isSelected ? 'true' : 'false');
                    optionEl.classList.toggle('is-selected', isSelected);
                    optionEl.tabIndex = isSelected ? 0 : -1;
                    if (isSelected) {
                        selectedOption = optionEl;
                    }
                });
                if (!selectedOption && options.length) {
                    options[0].tabIndex = 0;
                }
            }

            function renderMonthOptions() {
                var monthMarkup = [];
                var monthListMarkup = [];
                for (var i = 0; i < monthNames.length; i += 1) {
                    monthMarkup.push('<option value="' + i + '">' + monthNames[i] + '</option>');
                    monthListMarkup.push('<button type="button" role="option" class="birthdate-list-option" data-value="' + i + '">' + monthNames[i] + '</button>');
                }
                birthdateMonth.innerHTML = monthMarkup.join('');
                birthdateMonthList.innerHTML = monthListMarkup.join('');
                syncListSelection(birthdateMonthList, viewMonth);
                updateJumpLabels();
            }

            function renderYearOptions() {
                var yearMarkup = [];
                var yearListMarkup = [];
                for (var year = today.getFullYear(); year >= 1900; year -= 1) {
                    yearMarkup.push('<option value="' + year + '">' + year + '</option>');
                    yearListMarkup.push('<button type="button" role="option" class="birthdate-list-option" data-value="' + year + '">' + year + '</button>');
                }
                birthdateYear.innerHTML = yearMarkup.join('');
                birthdateYearList.innerHTML = yearListMarkup.join('');
                syncListSelection(birthdateYearList, viewYear);
                updateJumpLabels();
            }

            function renderCalendar() {
                birthdateMonth.value = String(viewMonth);
                birthdateYear.value = String(viewYear);
                syncListSelection(birthdateMonthList, viewMonth);
                syncListSelection(birthdateYearList, viewYear);
                updateJumpLabels();

                var selected = selectedIso();
                var first = new Date(viewYear, viewMonth, 1);
                var startDay = first.getDay();
                var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
                var cells = [];

                for (var blank = 0; blank < startDay; blank += 1) {
                    cells.push('<span class="dp-blank" aria-hidden="true"></span>');
                }

                for (var day = 1; day <= daysInMonth; day += 1) {
                    var dateObj = new Date(viewYear, viewMonth, day);
                    var iso = isoFromDate(dateObj);
                    var isFuture = dateObj > maxDate;
                    var isBeforeMin = dateObj < minDate;
                    var disabled = isFuture || isBeforeMin;
                    var selectedClass = selected && selected === iso ? ' selected' : '';
                    cells.push(
                        '<button type="button" class="dp-day' + selectedClass + '" data-date="' + iso + '" role="gridcell"' +
                            ' aria-selected="' + (selected && selected === iso ? 'true' : 'false') + '"' +
                            (disabled ? ' disabled aria-disabled="true" tabindex="-1"' : '') + '>' + day + '</button>'
                    );
                }

                birthdateGrid.innerHTML = cells.join('');
            }

            function closeBirthdate(focusInput) {
                closeJumpLists(false);
                if (typeof closeBirthdateFloating === 'function') {
                    closeBirthdateFloating();
                }
                closeBirthdateFloating = null;
                birthdateWrap.classList.remove('is-open');
                birthdatePanel.setAttribute('aria-hidden', 'true');
                birthdateInput.setAttribute('aria-expanded', 'false');
                if (focusInput) {
                    birthdateInput.focus();
                }
            }

            function openBirthdate() {
                var typedIso = selectedIso();
                var parsed = parseIso(typedIso);
                if (parsed) {
                    viewYear = parsed.getFullYear();
                    viewMonth = parsed.getMonth();
                }
                renderCalendar();

                birthdateWrap.classList.add('is-open');
                birthdateWrap.classList.add('is-focused');
                birthdateInput.setAttribute('aria-expanded', 'true');
                closeJumpLists(false);
                if (typeof closeBirthdateFloating === 'function') {
                    closeBirthdateFloating();
                }
                closeBirthdateFloating = openPanel(birthdatePanel, birthdateWrap, {
                    minWidth: 240,
                    offsetY: 8,
                    margin: 8,
                    stickToBottom: true,
                    closeOnScroll: false,
                    onRequestClose: function () {
                        closeBirthdate(false);
                    }
                });

                var selectedBtn = birthdateGrid.querySelector('.dp-day.selected') || birthdateGrid.querySelector('.dp-day:not([disabled])');
                if (selectedBtn) {
                    window.setTimeout(function () {
                        selectedBtn.focus();
                    }, 0);
                }
            }

            function selectMonth(value, focusTrigger) {
                var nextMonth = Number(value);
                if (Number.isNaN(nextMonth) || nextMonth < 0 || nextMonth > 11) return;
                viewMonth = nextMonth;
                birthdateMonth.value = String(nextMonth);
                renderCalendar();
                closeMonthList(Boolean(focusTrigger));
            }

            function selectYear(value, focusTrigger) {
                var nextYear = Number(value);
                if (Number.isNaN(nextYear) || nextYear < 1900 || nextYear > today.getFullYear()) return;
                viewYear = nextYear;
                birthdateYear.value = String(nextYear);
                renderCalendar();
                closeYearList(Boolean(focusTrigger));
            }

            function openMonthList() {
                if (birthdatePanel.getAttribute('aria-hidden') !== 'false') {
                    openBirthdate();
                }
                closeYearList(false);
                birthdateMonthTrigger.setAttribute('aria-expanded', 'true');
                if (typeof closeBirthdateMonthFloating === 'function') {
                    closeBirthdateMonthFloating();
                }
                closeBirthdateMonthFloating = openPanel(birthdateMonthList, birthdateMonthTrigger, {
                    stickToBottom: true,
                    closeOnScroll: false,
                    offsetY: 6,
                    margin: 8,
                    minWidth: birthdateMonthTrigger.offsetWidth || 140,
                    onRequestClose: function () {
                        closeMonthList(false);
                    }
                });
                focusSelectedOrFirst(birthdateMonthList, false);
            }

            function openYearList() {
                if (birthdatePanel.getAttribute('aria-hidden') !== 'false') {
                    openBirthdate();
                }
                closeMonthList(false);
                birthdateYearTrigger.setAttribute('aria-expanded', 'true');
                if (typeof closeBirthdateYearFloating === 'function') {
                    closeBirthdateYearFloating();
                }
                closeBirthdateYearFloating = openPanel(birthdateYearList, birthdateYearTrigger, {
                    stickToBottom: true,
                    closeOnScroll: false,
                    offsetY: 6,
                    margin: 8,
                    minWidth: birthdateYearTrigger.offsetWidth || 120,
                    onRequestClose: function () {
                        closeYearList(false);
                    }
                });
                focusSelectedOrFirst(birthdateYearList, false);
            }

            function wireBirthdateSelectors() {
                birthdateMonthTrigger.addEventListener('click', function () {
                    if (birthdateMonthTrigger.getAttribute('aria-expanded') === 'true') {
                        closeMonthList(false);
                    } else {
                        openMonthList();
                    }
                });

                birthdateYearTrigger.addEventListener('click', function () {
                    if (birthdateYearTrigger.getAttribute('aria-expanded') === 'true') {
                        closeYearList(false);
                    } else {
                        openYearList();
                    }
                });

                birthdateMonthTrigger.addEventListener('keydown', function (event) {
                    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
                        event.preventDefault();
                        openMonthList();
                    }
                    if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        openMonthList();
                        focusSelectedOrFirst(birthdateMonthList, true);
                    }
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        closeMonthList(false);
                    }
                });

                birthdateYearTrigger.addEventListener('keydown', function (event) {
                    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
                        event.preventDefault();
                        openYearList();
                    }
                    if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        openYearList();
                        focusSelectedOrFirst(birthdateYearList, true);
                    }
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        closeYearList(false);
                    }
                });

                birthdateMonthList.addEventListener('click', function (event) {
                    var optionEl = event.target && event.target.closest ? event.target.closest('.birthdate-list-option') : null;
                    if (!optionEl) return;
                    selectMonth(optionEl.getAttribute('data-value'), true);
                });

                birthdateYearList.addEventListener('click', function (event) {
                    var optionEl = event.target && event.target.closest ? event.target.closest('.birthdate-list-option') : null;
                    if (!optionEl) return;
                    selectYear(optionEl.getAttribute('data-value'), true);
                });

                birthdateMonthList.addEventListener('keydown', function (event) {
                    if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        focusRelativeOption(birthdateMonthList, 1);
                    }
                    if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        focusRelativeOption(birthdateMonthList, -1);
                    }
                    if (event.key === 'Home') {
                        event.preventDefault();
                        focusSelectedOrFirst(birthdateMonthList, false);
                    }
                    if (event.key === 'End') {
                        event.preventDefault();
                        focusSelectedOrFirst(birthdateMonthList, true);
                    }
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        var monthOption = document.activeElement;
                        if (!monthOption || !monthOption.classList || !monthOption.classList.contains('birthdate-list-option')) return;
                        selectMonth(monthOption.getAttribute('data-value'), true);
                    }
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        closeMonthList(true);
                    }
                });

                birthdateYearList.addEventListener('keydown', function (event) {
                    if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        focusRelativeOption(birthdateYearList, 1);
                    }
                    if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        focusRelativeOption(birthdateYearList, -1);
                    }
                    if (event.key === 'Home') {
                        event.preventDefault();
                        focusSelectedOrFirst(birthdateYearList, false);
                    }
                    if (event.key === 'End') {
                        event.preventDefault();
                        focusSelectedOrFirst(birthdateYearList, true);
                    }
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        var yearOption = document.activeElement;
                        if (!yearOption || !yearOption.classList || !yearOption.classList.contains('birthdate-list-option')) return;
                        selectYear(yearOption.getAttribute('data-value'), true);
                    }
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        closeYearList(true);
                    }
                });
            }

            function moveFocusedDay(delta) {
                var active = document.activeElement;
                if (!active || !active.classList || !active.classList.contains('dp-day')) return;
                var iso = active.getAttribute('data-date') || '';
                var dateObj = parseIso(iso);
                if (!dateObj) return;
                var next = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + delta);
                if (next > maxDate) next = new Date(maxDate.getTime());
                if (next < minDate) next = new Date(minDate.getTime());
                viewYear = next.getFullYear();
                viewMonth = next.getMonth();
                renderCalendar();
                var targetIso = isoFromDate(next);
                var target = birthdateGrid.querySelector('.dp-day[data-date="' + targetIso + '"]');
                if (target && !target.disabled) target.focus();
            }

            renderMonthOptions();
            renderYearOptions();
            renderCalendar();
            wireBirthdateSelectors();

            birthdateInput.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    openBirthdate();
                }
                if (event.key === 'Escape') {
                    event.preventDefault();
                    closeBirthdate(false);
                }
            });

            birthdateInput.addEventListener('focus', function () {
                birthdateWrap.classList.add('is-focused');
            });

            birthdateInput.addEventListener('click', function () {
                openBirthdate();
            });

            if (birthdateTrigger) {
                birthdateTrigger.addEventListener('click', function () {
                    openBirthdate();
                });

                birthdateTrigger.addEventListener('keydown', function (event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openBirthdate();
                    }
                });
            }

            birthdateInput.addEventListener('blur', function () {
                var iso = parseBirthdateDisplayToIso((birthdateInput.value || '').trim());
                if (iso) {
                    setBirthdateIso(iso);
                }
            });

            birthdatePrev.addEventListener('click', function () {
                viewMonth -= 1;
                if (viewMonth < 0) {
                    viewMonth = 11;
                    viewYear -= 1;
                }
                if (viewYear < 1900) {
                    viewYear = 1900;
                    viewMonth = 0;
                }
                renderCalendar();
            });

            birthdateNext.addEventListener('click', function () {
                viewMonth += 1;
                if (viewMonth > 11) {
                    viewMonth = 0;
                    viewYear += 1;
                }
                if (viewYear > today.getFullYear()) {
                    viewYear = today.getFullYear();
                    viewMonth = today.getMonth();
                }
                renderCalendar();
            });

            birthdateMonth.addEventListener('change', function () {
                viewMonth = Number(birthdateMonth.value || 0);
                renderCalendar();
            });

            birthdateYear.addEventListener('change', function () {
                viewYear = Number(birthdateYear.value || today.getFullYear());
                renderCalendar();
            });

            birthdateGrid.addEventListener('click', function (event) {
                var target = event.target;
                if (!target || !target.classList || !target.classList.contains('dp-day')) return;
                if (target.disabled) return;
                var iso = target.getAttribute('data-date') || '';
                if (!iso) return;
                setBirthdateIso(iso);
                closeBirthdate(true);
                renderCalendar();
            });

            birthdateGrid.addEventListener('keydown', function (event) {
                if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    moveFocusedDay(1);
                }
                if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    moveFocusedDay(-1);
                }
                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    moveFocusedDay(7);
                }
                if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    moveFocusedDay(-7);
                }
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    var active = document.activeElement;
                    if (!active || !active.classList || !active.classList.contains('dp-day') || active.disabled) return;
                    var selectedIso = active.getAttribute('data-date') || '';
                    if (!selectedIso) return;
                    setBirthdateIso(selectedIso);
                    closeBirthdate(true);
                    renderCalendar();
                }
                if (event.key === 'Escape') {
                    event.preventDefault();
                    closeBirthdate(true);
                }
            });

            birthdatePanel.addEventListener('keydown', function (event) {
                if (event.key === 'Tab') {
                    closeBirthdate(false);
                }
            });
        }
    }

    window.tpl1PhoneUtils = window.tpl1PhoneUtils || {};
    window.tpl1PhoneUtils.stripNonDigits = stripNonDigits;
    window.tpl1PhoneUtils.normalizeAndValidatePH = normalizeAndValidatePH;
    window.tpl1PhoneUtils.normalizePH = function (value) {
        var tmpId = 'tpl1PhoneUtilsTempInput';
        var temp = document.getElementById(tmpId);
        if (!temp) {
            temp = document.createElement('input');
            temp.type = 'tel';
            temp.id = tmpId;
            temp.style.display = 'none';
            document.body.appendChild(temp);
        }
        temp.value = value || '';
        return normalizeAndValidatePH('tpl1PhoneUnified', tmpId);
    };
    window.tpl1PhoneUtils.selectCountry = function (containerId, code) {
        var container = document.getElementById(containerId || 'tpl1PhoneUnified');
        if (!container) return;
        var list = container.querySelector('.tpl1-phone-country-list');
        if (!list) return;
        var target = list.querySelector('.country-option[data-code="' + code + '"]');
        if (!target) return;
        list.querySelectorAll('.country-option').forEach(function (opt) {
            opt.setAttribute('aria-selected', opt === target ? 'true' : 'false');
        });
        var flagEl = container.querySelector('.tpl1-flag');
        var codeEl = container.querySelector('.tpl1-code');
        var flag = target.querySelector('.flag');
        if (flagEl && flag) flagEl.textContent = flag.textContent || '';
        if (codeEl) codeEl.textContent = code;
        container.setAttribute('data-selected-dial', code);
    };
    window.tpl1PhoneUtils.prettyApiError = prettyApiError;
    window.tpl1PhoneUtils.showInlineError = showInlineError;
    window.tpl1PhoneUtils.clearInlineError = clearInlineError;

    (function () {
        var FIELD_ERROR_MAP = {
            phone_number: 'tpl1AccountPhoneError',
            email: 'tpl1AccountEmailError',
            first_name: 'tpl1AccountFirstNameError',
            last_name: 'tpl1AccountLastNameError',
            birthdate: 'tpl1AccountBirthdateError',
            gender: 'tpl1AccountGenderError'
        };

        function toSingleLine(msg) {
            return String(msg || '').split(/\r?\n/)[0].trim();
        }

        function clearAllFieldErrors() {
            Object.keys(FIELD_ERROR_MAP).forEach(function (field) {
                var el = document.getElementById(FIELD_ERROR_MAP[field]);
                if (el) {
                    el.textContent = '';
                    el.classList.remove('show');
                    el.removeAttribute('role');
                }
            });
        }

        function showInlineFieldError(elId, message) {
            var el = document.getElementById(elId);
            if (!el) return;
            el.textContent = toSingleLine(message);
            el.classList.add('show');
            el.setAttribute('role', 'alert');
        }

        function showGlobalMessage(msg, isError) {
            var el = document.getElementById('tpl1AccountSaveMessage');
            if (!el) {
                window.alert(toSingleLine(msg));
                return;
            }
            el.textContent = toSingleLine(msg || (isError ? 'Unable to save changes.' : 'Saved.'));
            el.classList.add('show');
            window.setTimeout(function () {
                el.classList.remove('show');
            }, 3000);
        }

        function handleServerErrors(payload) {
            clearAllFieldErrors();

            if (!payload) {
                showGlobalMessage('Unexpected server response.', true);
                return;
            }

            var fieldErrors = payload.field_errors || {};
            var fields = Object.keys(fieldErrors);

            if (fields.length === 1) {
                var field = fields[0];
                var raw = fieldErrors[field];
                var message = Array.isArray(raw) ? raw[0] : (raw || payload.message || 'Invalid value.');
                var elId = FIELD_ERROR_MAP[field];
                if (elId && document.getElementById(elId)) {
                    showInlineFieldError(elId, message);
                    var top = document.getElementById('tpl1AccountSaveMessage');
                    if (top) { top.classList.remove('show'); top.textContent = ''; }
                } else {
                    showGlobalMessage(message, true);
                }
                return;
            }

            if (fields.length > 1) {
                fields.forEach(function (fieldName) {
                    var rawValue = fieldErrors[fieldName];
                    var messageValue = Array.isArray(rawValue) ? rawValue[0] : (rawValue || '');
                    var mappedElId = FIELD_ERROR_MAP[fieldName];
                    if (mappedElId && document.getElementById(mappedElId)) {
                        showInlineFieldError(mappedElId, messageValue);
                    }
                });
                showGlobalMessage(payload.message || 'Please fix the highlighted fields and try again.', true);
                return;
            }

            if (payload.message) {
                showGlobalMessage(payload.message, payload.ok === false);
                return;
            }

            showGlobalMessage('Unable to save changes.', true);
        }

        window.tpl1ErrorUtils = window.tpl1ErrorUtils || {};
        window.tpl1ErrorUtils.handleServerErrors = handleServerErrors;
        window.tpl1ErrorUtils.showInlineError = showInlineFieldError;
        window.tpl1ErrorUtils.clearAllFieldErrors = clearAllFieldErrors;
    })();

    function readLocalCompletedKeys() {
        try {
            var raw = localStorage.getItem(progressStorageKey);
            if (!raw) return [];
            var parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.warn('Unable to read local onboarding cache:', e);
            return [];
        }
    }

    function writeLocalCompletedKeys() {
        try {
            var keys = [];
            for (var i = 0; i < steps.length; i += 1) {
                if (completed.has(i)) {
                    keys.push(steps[i].storageKey);
                }
            }
            localStorage.setItem(progressStorageKey, JSON.stringify(keys));
        } catch (e) {
            console.warn('Unable to write local onboarding cache:', e);
        }
    }

    function readLocalViewState() {
        try {
            var raw = localStorage.getItem(viewStateStorageKey);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return null;
            }
            return parsed;
        } catch (e) {
            console.warn('Unable to read local onboarding view state:', e);
            return null;
        }
    }

    function writeLocalViewState() {
        try {
            localStorage.setItem(viewStateStorageKey, JSON.stringify({
                currentIndex: Math.max(0, Number(current) || 0),
                showCongratsPanel: Boolean(showCongratsPanel),
                updatedAt: Date.now()
            }));
        } catch (e) {
            console.warn('Unable to write local onboarding view state:', e);
        }
    }

    function restoreViewStateFromLocal() {
        var persisted = readLocalViewState();
        if (!persisted) {
            current = findFirstUnlockedIndex();
            showCongratsPanel = false;
            syncOpenGroupForIndex(current);
            return;
        }

        var persistedIndex = Math.floor(Number(persisted.currentIndex));
        var hasValidIndex = Number.isFinite(persistedIndex)
            && persistedIndex >= 0
            && persistedIndex < steps.length
            && !isLocked(persistedIndex);

        current = hasValidIndex ? persistedIndex : findFirstUnlockedIndex();

        var wantsCongrats = persisted.showCongratsPanel === true;
        showCongratsPanel = wantsCongrats && !isCongratsLocked();

        syncOpenGroupForIndex(current);
    }

    function sanitizeVideoQuizState(rawState) {
        rawState = rawState || {};
        var selectedAnswers = Array.isArray(rawState.selectedAnswers)
            ? rawState.selectedAnswers.filter(function (value) { return typeof value === 'number'; })
            : [];
        return {
            started: Boolean(rawState.started),
            passed: Boolean(rawState.passed),
            currentIndex: Math.max(0, Number(rawState.currentIndex) || 0),
            selectedAnswers: selectedAnswers,
            attempts: Math.max(1, Number(rawState.attempts) || 1),
            lastScore: typeof rawState.lastScore === 'number' ? rawState.lastScore : null,
            durationSec: Math.max(0, Number(rawState.durationSec) || 0),
            watchSeconds: Math.max(0, Number(rawState.watchSeconds) || 0),
            watchPercent: Math.max(0, Math.min(100, Number(rawState.watchPercent) || 0)),
            startedAtMs: Number(rawState.startedAtMs) || Date.now(),
            showResult: Boolean(rawState.showResult),
            playbackFinished: Boolean(rawState.playbackFinished),
            updatedAt: Number(rawState.updatedAt) || Date.now()
        };
    }

    function readLocalVideoQuizStates() {
        try {
            var raw = localStorage.getItem(videoQuizStorageKey);
            if (!raw) return {};
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return {};
            }
            return parsed;
        } catch (e) {
            console.warn('Unable to read local video quiz cache:', e);
            return {};
        }
    }

    function writeLocalVideoQuizStates() {
        try {
            localStorage.setItem(videoQuizStorageKey, JSON.stringify(videoQuizStateByStorageKey));
        } catch (e) {
            console.warn('Unable to write local video quiz cache:', e);
        }
    }

    function seedVideoQuizStatesFromLocal() {
        var persisted = readLocalVideoQuizStates();
        var keys = Object.keys(persisted);
        for (var i = 0; i < keys.length; i += 1) {
            var key = keys[i];
            videoQuizStateByStorageKey[key] = sanitizeVideoQuizState(persisted[key]);
        }
    }

    function persistVideoQuizState(step) {
        if (!step || !step.storageKey) return;
        if (!videoQuizStateByStorageKey[step.storageKey]) return;
        videoQuizStateByStorageKey[step.storageKey] = sanitizeVideoQuizState(videoQuizStateByStorageKey[step.storageKey]);
        writeLocalVideoQuizStates();
    }

    function applyCompletedKeys(keys) {
        var keySet = new Set(keys || []);
        completed.clear();
        for (var i = 0; i < steps.length; i += 1) {
            if (keySet.has(steps[i].storageKey)) {
                completed.add(i);
            }
        }
    }

    function mergeServerAndLocalCompletedKeys(serverKeys, localKeys) {
        var merged = new Set(Array.isArray(serverKeys) ? serverKeys : []);
        var persisted = Array.isArray(localKeys) ? localKeys : [];

        // Keep local Agent Foundation progress when temporary bypass completions have not been saved on the server yet.
        for (var i = 0; i < persisted.length; i += 1) {
            var key = String(persisted[i] || '').trim();
            if (!key) continue;
            var stepIndex = findStepIndexByStorageKey(key);
            if (stepIndex < 0) continue;
            if (steps[stepIndex] && steps[stepIndex].group === AGENT_FOUNDATION_GROUP_TITLE) {
                merged.add(key);
            }
        }

        return Array.from(merged);
    }

    function seedCompletedFromBootstrap() {
        var raw = (root.getAttribute('data-completed-steps') || '').trim();
        var localKeys = readLocalCompletedKeys();
        if (!raw) {
            applyCompletedKeys(localKeys);
            return;
        }
        try {
            var keys = JSON.parse(raw);
            if (Array.isArray(keys)) {
                applyCompletedKeys(mergeServerAndLocalCompletedKeys(keys, localKeys));
                writeLocalCompletedKeys();
            }
        } catch (e) {
            console.warn('Onboarding bootstrap data malformed:', e);
            applyCompletedKeys(localKeys);
        }
    }

    async function hydrateProgressFromServer() {
        try {
            var response = await fetch('/portal-onboarding/progress/', {
                method: 'GET',
                credentials: 'same-origin'
            });

            var payload = {};
            try {
                payload = await response.json();
            } catch (jsonError) {
                payload = {};
            }

            if (!response.ok || !payload.ok || !Array.isArray(payload.completed_steps)) {
                var loadError = {
                    status: response.status,
                    code: payload.code || 'ONBOARDING_PROGRESS_LOAD_FAILED',
                    detail: payload.detail || payload.message || 'Unknown progress load failure.'
                };
                // Operational note: if code === ONBOARDING_DB_NOT_READY, run:
                // python manage.py makemigrations app
                // python manage.py migrate
                console.warn('Onboarding progress fetch failed. Keeping current state.', loadError);
                return; // Do NOT clear: keep bootstrapped or previously fetched data.
            }

            applyCompletedKeys(mergeServerAndLocalCompletedKeys(payload.completed_steps, readLocalCompletedKeys()));
            writeLocalCompletedKeys();
        } catch (error) {
            var networkLoadError = {
                status: null,
                code: 'ONBOARDING_PROGRESS_NETWORK_ERROR',
                detail: error && error.message ? error.message : String(error)
            };
            console.warn('Onboarding progress sync failed. Keeping current state.', networkLoadError);
            // Do NOT clear: keep bootstrapped or previously fetched data.
        }
    }

    async function hydrateCompletionMetaFromServer() {
        try {
            var response = await fetch(onboardingApi.completionEmailStatusUrl, {
                method: 'GET',
                credentials: 'same-origin'
            });

            var payload = {};
            try {
                payload = await response.json();
            } catch (jsonError) {
                payload = {};
            }

            if (response.ok && payload && payload.ok) {
                updateCompletionCertificateMeta(payload);
            }
        } catch (error) {
            console.warn('Completion metadata sync failed. Keeping local certificate metadata.', error);
        }
    }

    function groupMap() {
        var map = {};
        for (var i = 0; i < steps.length; i += 1) {
            var key = steps[i].group;
            if (!map[key]) map[key] = [];
            map[key].push(i);
        }
        return map;
    }

    function getOrderedGroupKeys(map) {
        var preferredOrder = [
            'Welcome and Orientation',
            'Profile & Credentials',
            'VIDEO LOOM',
            AGENT_FOUNDATION_GROUP_TITLE
        ];
        var available = Object.keys(map || {});
        var ordered = [];

        for (var i = 0; i < preferredOrder.length; i += 1) {
            if (available.indexOf(preferredOrder[i]) !== -1) {
                ordered.push(preferredOrder[i]);
            }
        }

        for (var j = 0; j < available.length; j += 1) {
            if (ordered.indexOf(available[j]) === -1) {
                ordered.push(available[j]);
            }
        }

        return ordered;
    }

    function syncOpenGroupForIndex(index) {
        var map = groupMap();
        var keys = getOrderedGroupKeys(map);
        var step = steps[index];
        if (!step) return;

        var groupIdx = keys.indexOf(step.group);
        openGroups.clear();
        if (groupIdx >= 0) {
            openGroups.add(groupIdx);
        }
    }

    function isLocked(index) {
        if (DEV_UNLOCK_ALL_ONBOARDING_STEPS) return false;
        var targetStep = steps[index];
        if (DEV_UNLOCK_MODULE_3 && targetStep && targetStep.moduleId === 'module_3_money_mindset') return false;
        if (index <= 0) return false;
        for (var i = 0; i < index; i += 1) {
            if (!completed.has(i)) return true;
        }
        return false;
    }

    function findFirstUnlockedIndex() {
        for (var i = 0; i < steps.length; i += 1) {
            if (!isLocked(i) && !completed.has(i)) return i;
        }
        return Math.max(0, steps.length - 1);
    }

    function findStepIndexByStorageKey(stepKey) {
        for (var i = 0; i < steps.length; i += 1) {
            if (steps[i] && steps[i].storageKey === stepKey) {
                return i;
            }
        }
        return -1;
    }

    function reviewStepIndex() {
        for (var i = 0; i < steps.length; i += 1) {
            if (steps[i] && steps[i].type === 'review') {
                return i;
            }
        }
        return -1;
    }

    function areAllRealStepsComplete() {
        for (var i = 0; i < steps.length; i += 1) {
            if (!completed.has(i)) {
                return false;
            }
        }
        return steps.length > 0;
    }

    function isCongratsLocked() {
        if (DEV_UNLOCK_ALL_ONBOARDING_STEPS) return false;
        return !areAllRealStepsComplete();
    }

    function isCongratsPanelActive() {
        return showCongratsPanel && !isCongratsLocked();
    }

    function getStepIndicesForGroup(groupTitle) {
        var map = groupMap();
        var indices = map[groupTitle] || [];
        return indices.slice();
    }

    function areStepIndicesComplete(indices, skipIndex) {
        if (!Array.isArray(indices) || !indices.length) {
            return false;
        }

        for (var i = 0; i < indices.length; i += 1) {
            var idx = indices[i];
            if (idx === skipIndex) continue;
            if (!completed.has(idx)) {
                return false;
            }
        }
        return true;
    }

    function isFinalAgentFoundationCompletionClick(stepIndex) {
        var step = steps[stepIndex];
        if (!step || step.group !== AGENT_FOUNDATION_GROUP_TITLE) {
            return false;
        }

        if (completed.has(stepIndex)) {
            return false;
        }

        var agentFoundationIndices = getStepIndicesForGroup(AGENT_FOUNDATION_GROUP_TITLE);
        return areStepIndicesComplete(agentFoundationIndices, stepIndex);
    }

    function normalizeCompletionEmailStatusPayload(payload) {
        var responseCode = payload && payload.code ? String(payload.code) : '';
        var emailStatus = payload && payload.email_status ? String(payload.email_status) : '';

        if (!emailStatus) {
            if (responseCode === 'ONBOARDING_COMPLETION_ALREADY_SENT') {
                emailStatus = 'already_sent';
            } else if (responseCode === 'ONBOARDING_COMPLETION_NO_EMAIL') {
                emailStatus = 'no_email';
            } else if (responseCode === 'ONBOARDING_COMPLETION_EMAIL_PENDING') {
                emailStatus = 'pending';
            } else if (responseCode === 'ONBOARDING_COMPLETION_EMAIL_SENT') {
                emailStatus = 'sent';
            } else if (responseCode === 'ONBOARDING_COMPLETION_EMAIL_FAILED') {
                emailStatus = 'failed';
            }
        }

        if (emailStatus === 'sent_now') {
            return 'sent';
        }
        if (emailStatus === 'delivery_failed') {
            return 'failed';
        }

        return emailStatus;
    }

    async function triggerAgentFoundationCompletionEmail(options) {
        var normalizedOptions = options && typeof options === 'object' ? options : {};
        var forceResend = normalizedOptions.forceResend === true || normalizedOptions.force_resend === true;

        if (agentFoundationCompletionEmailInFlight) {
            return;
        }

        if (agentFoundationCompletionEmailTriggered && !forceResend) {
            return;
        }

        agentFoundationCompletionEmailInFlight = true;

        try {
            var statusResponse = await fetch(onboardingApi.completionEmailStatusUrl, {
                method: 'GET',
                credentials: 'same-origin'
            });

            var statusPayload = {};
            try {
                statusPayload = await statusResponse.json();
            } catch (statusJsonError) {
                statusPayload = {};
            }

            if (statusResponse.ok && statusPayload.ok) {
                updateCompletionCertificateMeta(statusPayload);
                var existingStatus = normalizeCompletionEmailStatusPayload(statusPayload);
                if (!forceResend && (existingStatus === 'sent' || existingStatus === 'already_sent' || existingStatus === 'pending')) {
                    agentFoundationCompletionEmailTriggered = true;
                    return;
                }
            }

            var completionHeaders = {
                'X-CSRFToken': getCookie('csrftoken')
            };
            var completionBody = null;
            if (forceResend) {
                completionHeaders['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
                completionBody = 'force_resend=1';
            }

            var response = await fetch(onboardingApi.completionUrl, {
                method: 'POST',
                credentials: 'same-origin',
                headers: completionHeaders,
                body: completionBody
            });

            var payload = {};
            try {
                payload = await response.json();
            } catch (jsonError) {
                payload = {};
            }

            updateCompletionCertificateMeta(payload);
            var emailStatus = normalizeCompletionEmailStatusPayload(payload);

            if (response.ok && payload.ok && (emailStatus === 'sent' || emailStatus === 'already_sent' || emailStatus === 'pending')) {
                if (emailStatus === 'sent' && !completionCertificateMeta.sentAt) {
                    completionCertificateMeta.sentAt = new Date().toISOString();
                }
                agentFoundationCompletionEmailTriggered = true;
                return;
            }

            console.warn('[onboarding][training-email] completion request failed.', {
                status: response.status,
                code: payload.code || '',
                emailStatus: emailStatus || '',
                message: payload.message || ''
            });
        } catch (error) {
            console.warn('[onboarding][training-email] completion request error.', error);
        } finally {
            agentFoundationCompletionEmailInFlight = false;
        }
    }

    if (typeof window !== 'undefined') {
        window.triggerAgentFoundationCompletionEmail = triggerAgentFoundationCompletionEmail;
    }

    function getOnboardingStageBlueprint() {
        return [
            { group: 'Welcome and Orientation', label: 'INTRODUCTION' },
            { group: 'Profile & Credentials', label: 'PROFILE AND CREDENTIALS' },
            { group: 'VIDEO LOOM', label: 'OBJECTION HANDLING' },
            { group: AGENT_FOUNDATION_GROUP_TITLE, label: 'AGENT FOUNDATION' }
        ];
    }

    function getOnboardingStageProgressSnapshot() {
        var map = groupMap();
        var welcomeIndices = map['Welcome and Orientation'] || [];
        var profileIndices = map['Profile & Credentials'] || [];
        var agentIndices = map[AGENT_FOUNDATION_GROUP_TITLE] || [];

        function areAllCompleted(indices) {
            if (!indices.length) return false;
            for (var i = 0; i < indices.length; i += 1) {
                if (!completed.has(indices[i])) {
                    return false;
                }
            }
            return true;
        }

        function toStageLabel(value, fallback) {
            var raw = String(value || '').trim();
            if (!raw) {
                raw = String(fallback || '').trim();
            }
            raw = raw.replace(/^module\s+\d+\s*:\s*/i, '');
            return raw.toUpperCase();
        }

        var welcomeComplete = areAllCompleted(welcomeIndices);
        var profileComplete = areAllCompleted(profileIndices);

        var completedAgentModules = 0;
        var latestAgentModuleLabel = 'AGENT FOUNDATION';
        var progressTrackLabels = [
            'INTRODUCTION',
            'PROFILE AND CREDENTIALS'
        ];

        // Collect Video Loom step labels FIRST (to match blueprint order: Video Loom comes before Agent Foundation)
        var videoLoomIndices = map['VIDEO LOOM'] || [];
        var videoDone = 0;
        var videoStepLabels = [];
        var latestVideoLoomLabel = '';
        if (videoLoomIndices.length) {
            for (var vi = 0; vi < videoLoomIndices.length; vi += 1) {
                var sidx = videoLoomIndices[vi];
                var sstep = steps[sidx] || {};
                var label = toStageLabel(sstep.title || 'Video', 'VIDEO LOOM');
                videoStepLabels.push(label);
                if (completed.has(sidx)) videoDone += 1;
            }
            // Append each video step as its own stage so the modal can show per-step progress.
            Array.prototype.push.apply(progressTrackLabels, videoStepLabels);
            if (videoDone > 0) {
                latestVideoLoomLabel = videoStepLabels[Math.max(0, Math.min(videoDone - 1, videoStepLabels.length - 1))] || '';
            }
        }

        // Collect Agent Foundation module labels AFTER Video Loom
        var agentModuleLabels = [];
        if (agentIndices.length) {
            var moduleBuckets = {};
            var moduleOrder = [];

            for (var j = 0; j < agentIndices.length; j += 1) {
                var stepIndex = agentIndices[j];
                var step = steps[stepIndex] || {};
                var moduleTitle = String(step.moduleTitle || '').trim();
                var moduleId = String(getTrainingStepModuleId(step) || moduleTitle || ('agent-module-' + stepIndex)).trim();

                if (!moduleBuckets[moduleId]) {
                    moduleBuckets[moduleId] = {
                        moduleTitle: moduleTitle,
                        total: 0,
                        done: 0
                    };
                    moduleOrder.push(moduleId);
                }

                moduleBuckets[moduleId].total += 1;
                if (completed.has(stepIndex)) {
                    moduleBuckets[moduleId].done += 1;
                }
            }

            for (var k = 0; k < moduleOrder.length; k += 1) {
                var bucket = moduleBuckets[moduleOrder[k]];
                if (!bucket || !bucket.total) {
                    continue;
                }

                var moduleLabel = toStageLabel(bucket.moduleTitle, 'AGENT FOUNDATION');
                agentModuleLabels.push(moduleLabel);

                if (bucket.done < bucket.total) {
                    continue;
                }

                completedAgentModules += 1;
                latestAgentModuleLabel = moduleLabel;
            }
        }

        // Append Agent Foundation module labels after Video Loom (matching blueprint order)
        if (agentModuleLabels && agentModuleLabels.length) {
            Array.prototype.push.apply(progressTrackLabels, agentModuleLabels);
        }

        // Ensure we have at least three stages (fallback to latest agent label)
        if (progressTrackLabels.length < 3) {
            progressTrackLabels.push(latestAgentModuleLabel);
        }

        // Compute completed stages count matching the progressTrackLabels composition.
        // Start with welcome/profile
        var completedModules = 0;
        if (welcomeComplete) completedModules += 1;
        if (profileComplete) completedModules += 1;
        // Add Video Loom completed count
        completedModules += videoDone;
        // Add Agent Foundation completed count
        completedModules += completedAgentModules;

        var totalStages = progressTrackLabels.length;
        var currentStageIndex = totalStages
            ? Math.min(Math.max(completedModules - 1, 0), totalStages - 1)
            : 0;

        var latestCompletedLabel = '';
        var lastCompletionIsAgentFoundation = false;
        if (latestVideoLoomLabel) {
            latestCompletedLabel = latestVideoLoomLabel;
            lastCompletionIsAgentFoundation = false;
        } else if (completedAgentModules > 0) {
            latestCompletedLabel = latestAgentModuleLabel;
            lastCompletionIsAgentFoundation = true;
        } else if (profileComplete) {
            latestCompletedLabel = 'PROFILE AND CREDENTIALS';
            lastCompletionIsAgentFoundation = false;
        } else if (welcomeComplete) {
            latestCompletedLabel = 'INTRODUCTION';
            lastCompletionIsAgentFoundation = false;
        }

        return {
            stageLabels: progressTrackLabels,
            totalStages: totalStages,
            completedModules: completedModules,
            currentStageIndex: currentStageIndex,
            currentStageLabel: progressTrackLabels[currentStageIndex] || '',
            latestCompletedLabel: latestCompletedLabel,
            hasAgentFoundationCompletion: completedAgentModules > 0,
            lastCompletionIsAgentFoundation: lastCompletionIsAgentFoundation,
            hasVideoLoomCompletion: !!(videoLoomIndices && videoLoomIndices.length && (videoDone === videoLoomIndices.length)),
            progressTrackLabels: progressTrackLabels
        };
    }

    function getCompletedModulesCount() {
        return getOnboardingStageProgressSnapshot().completedModules;
    }

    function notifyModulesCompletedIfChanged() {
        var modulesCompleted = getCompletedModulesCount();
        if (modulesCompleted === lastModulesCompletedNotified) return;
        lastModulesCompletedNotified = modulesCompleted;

        document.dispatchEvent(new CustomEvent('onboarding:modulesUpdated', {
            detail: { modulesCompleted: modulesCompleted }
        }));
    }
    
        // Debug instrumentation
        var _notifyDebugThreshold = window.__DEBUG_FLOATING_FIRE || window.__DEBUG_ONBOARDING;
        var _originalNotify = notifyModulesCompletedIfChanged;
        notifyModulesCompletedIfChanged = function() {
            var prevCount = lastModulesCompletedNotified;
            var currentCount = getCompletedModulesCount();
            if (_notifyDebugThreshold) {
                console.debug('[onboarding:notify]', {
                    previous: prevCount,
                    current: currentCount,
                    willDispatch: currentCount !== prevCount
                });
            }
            _originalNotify();
            if (_notifyDebugThreshold && currentCount !== prevCount) {
                console.debug('[onboarding:notify] Event dispatched! modulesCompleted=' + currentCount);
            }
        };

    function applyActivationMessageToElement(el, message, tone) {
        if (!el) return;
        el.textContent = message || '';
        el.classList.toggle('show', Boolean(message));
        el.classList.remove('info', 'success', 'warning', 'error');
        if (message && tone) {
            el.classList.add(tone);
        }
    }

    function syncActivationMessageViews() {
        applyActivationMessageToElement(document.getElementById('betaActivationMessage'), activationStatusMessage, activationStatusTone);
        applyActivationMessageToElement(document.getElementById('betaCongratsEmailStatus'), activationStatusMessage, activationStatusTone);
    }

    function setActivationStatusMessage(message, tone) {
        activationStatusMessage = message || '';
        activationStatusTone = tone || '';
        syncActivationMessageViews();
    }

    function icon(kind) {
        if (kind === 'done') {
            return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"></circle><path d="M7 12.5l3 3L17 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
        }
        if (kind === 'lock') {
            return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>';
        }
        if (kind === 'active') {
            return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"></circle><circle cx="12" cy="12" r="3" fill="currentColor"></circle></svg>';
        }
        return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"></circle></svg>';
    }

    function extractDriveFileId(url) {
        var value = String(url || '').trim();
        if (!value) return '';

        var fileMatch = value.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (fileMatch && fileMatch[1]) {
            return fileMatch[1];
        }

        var idMatch = value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
            return idMatch[1];
        }

        return '';
    }

    function buildDriveProxyUrl(value) {
        var fileId = extractDriveFileId(value);
        if (!fileId) return '';
        return '/portal-onboarding/video-proxy/?file_id=' + encodeURIComponent(fileId);
    }

    function resolvePossibleDriveUrl(value) {
        var raw = String(value || '').trim();
        if (!raw) return '';
        if (raw.indexOf('/portal-onboarding/video-proxy/?file_id=') === 0) return raw;
        if (raw.indexOf('drive.google.com') === -1 && raw.indexOf('drive.usercontent.google.com') === -1) return raw;
        return buildDriveProxyUrl(raw) || raw;
    }

    function getVideoSrcFromContentId(contentId, fallbackSrc) {
        if (contentId) {
            var contentEl = document.getElementById(contentId);
            if (contentEl) {
                var contentSrc = String(contentEl.getAttribute('data-video-src') || '').trim();
                if (!contentSrc) {
                    var driveFileId = String(contentEl.getAttribute('data-drive-file-id') || '').trim();
                    if (driveFileId) {
                        contentSrc = '/portal-onboarding/video-proxy/?file_id=' + encodeURIComponent(driveFileId);
                    }
                }
                return resolvePossibleDriveUrl(contentSrc || fallbackSrc || '');
            }
        }
        return resolvePossibleDriveUrl(fallbackSrc || '');
    }

    function getThumbnailSrcFromContentId(contentId, fallbackSrc) {
        if (contentId) {
            var contentEl = document.getElementById(contentId);
            if (contentEl) {
                return contentEl.getAttribute('data-thumbnail-src') || fallbackSrc || '';
            }
        }
        return fallbackSrc || '';
    }

    function resolveStepThumbnailSrc(step) {
        if (step && step.type === 'video' && step.moduleId) {
            return step.thumbnailSrc || TRAINING_VIDEO_GENERIC_THUMBNAIL;
        }
        return getThumbnailSrcFromContentId(step && step.contentId, step && step.thumbnailSrc);
    }

    function getTrainingVideoStepIndices() {
        var list = [];
        for (var i = 0; i < steps.length; i += 1) {
            if (steps[i] && steps[i].type === 'video') {
                list.push(i);
            }
        }
        return list;
    }

    function getCurrentPlayableVideoIndex() {
        var videoIndices = getTrainingVideoStepIndices();
        for (var i = 0; i < videoIndices.length; i += 1) {
            var idx = videoIndices[i];
            if (!completed.has(idx)) {
                return idx;
            }
        }
        return videoIndices.length ? videoIndices[videoIndices.length - 1] : -1;
    }

    function getTrainingStepModuleId(step) {
        if (!step) return '';

        var moduleId = String(step.moduleId || '').trim();
        if (moduleId) return moduleId;

        return String(step.moduleTitle || '').trim();
    }

    function syncSelectedTrainingModuleForIndex(stepIndex) {
        var nextStep = steps[stepIndex];
        var moduleId = getTrainingStepModuleId(nextStep);
        if (moduleId) {
            selectedTrainingModuleId = moduleId;
        }
    }

    function getActiveTrainingModuleId() {
        if (selectedTrainingModuleId) {
            return selectedTrainingModuleId;
        }

        var activeStep = steps[current];
        var activeModuleId = getTrainingStepModuleId(activeStep);
        if (activeModuleId) {
            return activeModuleId;
        }

        var nextPlayableIndex = getCurrentPlayableVideoIndex();
        var nextPlayableStep = steps[nextPlayableIndex];
        return getTrainingStepModuleId(nextPlayableStep);
    }

    function getPreferredTrainingStepIndexForModuleId(moduleId) {
        if (!moduleId) return -1;

        var moduleIndices = getTrainingVideoStepIndices().filter(function (idx) {
            return getTrainingStepModuleId(steps[idx]) === moduleId;
        });

        for (var i = 0; i < moduleIndices.length; i += 1) {
            if (!completed.has(moduleIndices[i]) && !isLocked(moduleIndices[i])) {
                return moduleIndices[i];
            }
        }

        for (var j = 0; j < moduleIndices.length; j += 1) {
            if (!isLocked(moduleIndices[j])) {
                return moduleIndices[j];
            }
        }

        return moduleIndices.length ? moduleIndices[0] : -1;
    }

    function getTrainingCardStatus(stepIndex) {
        // Force unlock all training cards for agent readiness quiz and videos
        if (completed.has(stepIndex)) return 'completed';
        return 'unlocked';
    }

    function getTrainingModuleCommentState(moduleId) {
        var key = String(moduleId || '').trim();
        if (!trainingModuleCommentStateById[key]) {
            trainingModuleCommentStateById[key] = {
                isOpen: false,
                text: '',
                comments: []
            };
        }
        return trainingModuleCommentStateById[key];
    }

    function getNameInitials(name) {
        var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return 'AG';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }

    var COMMENT_TIME_ZONE = 'Asia/Manila';

    function generateDefaultAvatarDataUrl(name) {
        try {
            var initials = getNameInitials(name);
            var colors = [
                '#EA4335', '#FBBC04', '#34A853', '#4285F4', '#EA4335', '#9C27B0', '#F44336', '#E91E63', '#2196F3',
                '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#FFC107', '#FF5722', '#795548'
            ];
            var hash = 0;
            for (var i = 0; i < name.length; i++) {
                hash = ((hash << 5) - hash) + name.charCodeAt(i);
                hash = hash & hash;
            }
            var colorIndex = Math.abs(hash) % colors.length;
            var bgColor = colors[colorIndex];
            
            var canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            var ctx = canvas.getContext('2d');
            if (!ctx) return undefined;
            
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, 128, 128);
            
            var roundedRadius = 10;
            ctx.clearRect(0, 0, 128, 128);
            ctx.beginPath();
            ctx.moveTo(roundedRadius, 0);
            ctx.lineTo(128 - roundedRadius, 0);
            ctx.quadraticCurveTo(128, 0, 128, roundedRadius);
            ctx.lineTo(128, 128 - roundedRadius);
            ctx.quadraticCurveTo(128, 128, 128 - roundedRadius, 128);
            ctx.lineTo(roundedRadius, 128);
            ctx.quadraticCurveTo(0, 128, 0, 128 - roundedRadius);
            ctx.lineTo(0, roundedRadius);
            ctx.quadraticCurveTo(0, 0, roundedRadius, 0);
            ctx.closePath();
            ctx.fillStyle = bgColor;
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(initials, 64, 64);
            
            return canvas.toDataURL('image/png');
        } catch (e) {
            return undefined;
        }
    }

    function parseCommentTimestampMs(raw) {
        if (raw === null || typeof raw === 'undefined') return NaN;

        if (typeof raw === 'number') {
            return isFinite(raw) && raw > 0 ? raw : NaN;
        }

        if (raw instanceof Date) {
            var ts = raw.getTime();
            return isFinite(ts) && ts > 0 ? ts : NaN;
        }

        var text = String(raw || '').trim();
        if (!text) return NaN;

        if (/^\d+$/.test(text)) {
            var numeric = Number(text);
            return isFinite(numeric) && numeric > 0 ? numeric : NaN;
        }

        var parsed = Date.parse(text);
        return isFinite(parsed) && parsed > 0 ? parsed : NaN;
    }

    function formatCommentTimestamp(value) {
        var parsed = parseCommentTimestampMs(value);
        if (!isFinite(parsed) || parsed <= 0) return 'Just now';
        var date = new Date(parsed);
        if (isNaN(date.getTime())) return 'Just now';
        try {
            return date.toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: COMMENT_TIME_ZONE
            });
        } catch (err) {
            return 'Just now';
        }
    }

    (function injectCommentStyles() {
        if (document.getElementById('tpl1CommentStyles')) return;
        var style = document.createElement('style');
        style.id = 'tpl1CommentStyles';
        style.textContent = [
            '@keyframes commentScalePop {',
            '  from { opacity: 0; transform: scale(0.88); }',
            '  to   { opacity: 1; transform: scale(1); }',
            '}',
            '.comment-pop {',
            '  animation: commentScalePop 0.22s cubic-bezier(.34,1.56,.64,1) forwards;',
            '}',
            '@keyframes replyBarIn {',
            '  from { opacity: 0; transform: translateY(-6px); }',
            '  to   { opacity: 1; transform: translateY(0); }',
            '}',
            '.tpl1-training-reply-bar {',
            '  display: none;',
            '  align-items: center;',
            '  justify-content: space-between;',
            '  gap: 10px;',
            '  border: 1px solid color-mix(in srgb, var(--line, #cdd7ea) 70%, transparent);',
            '  border-radius: 10px;',
            '  background: color-mix(in srgb, var(--comment-surface, #ffffff) 82%, var(--surface-soft, #edf3ff));',
            '  padding: 7px 10px;',
            '}',
            '.tpl1-training-reply-bar-main { min-width: 0; display: grid; gap: 2px; }',
            '.tpl1-reply-bar-title { font-size: 0.7rem; color: var(--muted); }',
            '.tpl1-reply-bar-name { font-size: 0.74rem; font-weight: 700; color: var(--text); }',
            '.tpl1-reply-bar-preview { font-size: 0.72rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 380px; }',
            '.tpl1-reply-bar-cancel { border: 0; background: transparent; color: var(--muted); font-size: 0.82rem; cursor: pointer; border-radius: 8px; padding: 2px 6px; transition: background-color 160ms ease, color 160ms ease; }',
            '.tpl1-reply-bar-cancel:hover, .tpl1-reply-bar-cancel:focus-visible { background: var(--comment-menu-hover, rgba(79, 143, 255, 0.12)); color: var(--text); outline: none; }',
            '.tpl1-training-comment-list { position: relative; }',
            '.tpl1-training-comment-item.is-reply { position: relative; margin-left: calc(var(--tpl1-reply-depth, 1) * 22px); }',
            '.tpl1-thread-guides { position: absolute; left: -32px; top: 10px; bottom: 10px; width: calc(var(--tpl1-reply-depth, 1) * 22px + 50px); --tpl1-thread-color: #1f9d55; pointer-events: none; z-index: 0; overflow: visible; }',
            '.tpl1-training-comment-item .tpl1-training-comment-avatar, .tpl1-training-comment-item .tpl1-training-comment-main { position: relative; z-index: 1; }',
            '.tpl1-thread-line { position: absolute; width: 2px; border-radius: 0; background: var(--tpl1-thread-color); opacity: 0.78; }',
            '.tpl1-thread-line.is-current { top: 0; bottom: 0; height: auto; }',
            '.tpl1-thread-elbow { position: absolute; top: 14px; width: 10px; height: 12px; border-left: 2px solid var(--tpl1-thread-color); border-bottom: 2px solid var(--tpl1-thread-color); border-bottom-left-radius: 0; opacity: 0.78; }',
            '.tpl1-training-comment-item.is-reply .tpl1-training-comment-main {',
            '  border-left: 0;',
            '  padding-left: 0;',
            '}',
            '@media (prefers-reduced-motion: reduce) {',
            '  .comment-pop { animation: none; opacity: 1; }',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    })();

    function applyPopAnimation(el, delay) {
        if (!el) return;
        el.style.opacity = '0';
        el.style.animationDelay = (delay || 0) + 'ms';
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
                el.classList.add('comment-pop');
                el.addEventListener('animationend', function () {
                    el.classList.remove('comment-pop');
                    el.style.opacity = '';
                    el.style.animationDelay = '';
                }, { once: true });
            });
        });
    }

    function normalizeTrainingCommentEntry(raw, fallbackName) {
        if (typeof raw === 'string') {
            return {
                id: 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
                text: raw,
                username: fallbackName || 'Agent',
                initials: getNameInitials(fallbackName || 'Agent'),
                photoUrl: resolveSidebarAvatarUrl(),
                createdAt: Date.now(),
                createdAtLabel: 'Just now',
                isMine: true,
                userId: null
            };
        }
        if (!raw || typeof raw !== 'object') {
            return null;
        }

        var text = String(raw.text || '').trim();
        if (!text) return null;
        var commentId = String(raw.id || raw.commentId || raw.comment_id || '').trim();
        if (!commentId) {
            commentId = 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
        }
        var username = String(raw.username || fallbackName || 'Agent').trim() || 'Agent';
        var initials = String(raw.initials || getNameInitials(username)).trim() || getNameInitials(username);
        var createdAt = parseCommentTimestampMs(
            raw.createdAt || raw.created_at_ms || raw.created_at_iso || raw.created_at
        );
        if (!isFinite(createdAt) || createdAt <= 0) {
            createdAt = Date.now();
        }
        var createdAtLabel = formatCommentTimestamp(createdAt);
        var mineRaw = raw.isMine;
        if (typeof mineRaw === 'undefined') {
            mineRaw = raw.is_mine;
        }
        var isMine = mineRaw === true || String(mineRaw).toLowerCase() === 'true';
        var userId = raw.userId;
        if (typeof userId === 'undefined') {
            userId = raw.user_id;
        }
        var parentId = raw.parentId;
        if (typeof parentId === 'undefined') {
            parentId = raw.parent_id;
        }
        var parentUsername = String(raw.parentUsername || raw.parent_username || '').trim();
        var parentTextPreview = String(raw.parentTextPreview || raw.parent_text_preview || '').trim();
        var photoUrl = String(raw.photo_url || raw.photoUrl || '').trim() || null;
        return {
            id: commentId,
            text: text,
            username: username,
            initials: initials,
            photoUrl: photoUrl,
            createdAt: createdAt,
            createdAtLabel: createdAtLabel,
            isMine: isMine,
            userId: userId,
            parentId: parentId,
            parentUsername: parentUsername,
            parentTextPreview: parentTextPreview
        };
    }

    function renderTrainingCommentItem(comment, fallbackName) {
        var normalized = normalizeTrainingCommentEntry(comment, fallbackName);
        if (!normalized) return '';

        var isReply = Boolean(normalized.parentId);

        var avatarSrc = normalized.photoUrl;
        if (!avatarSrc && normalized.isMine) {
            avatarSrc = resolveSidebarAvatarUrl();
        }
        if (!avatarSrc) {
            avatarSrc = generateDefaultAvatarDataUrl(normalized.username);
        }
        if (!avatarSrc) {
            avatarSrc = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"%3E%3Crect fill="%234285F4" width="128" height="128"/%3E%3Ctext x="50%" y="50%" font-size="56" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle"%3EAG%3C/text%3E%3C/svg%3E';
        }
        return '<li class="tpl1-training-comment-item' + (isReply ? ' is-reply' : '') + '" data-comment-id="' + escapeHtmlAttr(normalized.id) + '" data-is-mine="' + (normalized.isMine ? 'true' : 'false') + '">' +
            '<div class="tpl1-training-comment-avatar" aria-hidden="true">' +
                '<img class="tpl1-training-comment-avatar-img" src="' + escapeHtmlAttr(avatarSrc) + '" alt="" loading="lazy" decoding="async">' +
                '<span class="tpl1-training-avatar-coin" data-training-avatar-coin="1"></span>' +
            '</div>' +
            '<div class="tpl1-training-comment-main">' +
                '<div class="tpl1-training-comment-head">' +
                    '<strong class="tpl1-training-comment-user">' + escapeHtmlAttr(normalized.username) + '</strong>' +
                    '<span class="tpl1-training-comment-time" data-training-comment-time="1" data-comment-created-at="' + escapeHtmlAttr(normalized.createdAt) + '">' + escapeHtmlAttr(normalized.createdAtLabel || formatCommentTimestamp(normalized.createdAt)) + '</span>' +
                '</div>' +
                '<p class="tpl1-training-comment-text" data-training-comment-text="1">' + escapeHtmlAttr(normalized.text) + '</p>' +
                '<div class="tpl1-training-comment-edit" data-training-comment-edit="1" hidden>' +
                    '<input class="tpl1-training-comment-edit-input" data-training-comment-edit-input="1" type="text" value="' + escapeHtmlAttr(normalized.text) + '" />' +
                    '<div class="tpl1-training-comment-edit-actions">' +
                        '<button type="button" class="tpl1-training-comment-edit-btn save" data-training-comment-save="1">Save</button>' +
                        '<button type="button" class="tpl1-training-comment-edit-btn cancel" data-training-comment-cancel="1">Cancel</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</li>';
    }

    function hydrateTrainingCommentCoins(scopeEl) {
        if (!scopeEl || !window.lottie || typeof window.lottie.loadAnimation !== 'function') return;
        var coinEls = scopeEl.querySelectorAll('[data-training-avatar-coin="1"]');
        coinEls.forEach(function (coinEl) {
            if (!coinEl || coinEl.dataset.coinReady === '1') return;
            coinEl.dataset.coinReady = '1';
            try {
                var coinAnim = window.lottie.loadAnimation({
                    container: coinEl,
                    renderer: 'svg',
                    loop: false,
                    autoplay: false,
                    path: '/static/json/b_coin.json',
                    rendererSettings: {
                        preserveAspectRatio: 'xMidYMid meet'
                    }
                });
                if (coinAnim && typeof coinAnim.goToAndStop === 'function') {
                    coinAnim.goToAndStop(0, true);
                }
            } catch (err) {}
        });
    }

    function escapeHtmlAttr(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function fileMetaName(fileMeta) {
        if (!fileMeta || !fileMeta.name) return '';
        return String(fileMeta.name);
    }

    function fileMetaUrl(fileMeta) {
        if (!fileMeta || !fileMeta.url) return '';
        return String(fileMeta.url).trim();
    }

    function resolveSidebarAvatarUrl() {
        if (!root) return '/static/images/module%20profile%20default.jpg';
        var configured = String(root.getAttribute('data-user-icon-url') || '').trim();
        if (configured) return configured;
        var fallback = String(root.getAttribute('data-default-user-icon-url') || '').trim();
        if (fallback) return fallback;
        return '/static/images/module%20profile%20default.jpg';
    }

    function buildSidebarAvatarHtml(avatarUrl) {
        var resolvedAvatarUrl = avatarUrl || resolveSidebarAvatarUrl();
        return '<img class="tpl1-side-avatar-img" src="' + escapeHtmlAttr(resolvedAvatarUrl) + '" alt="" loading="lazy" decoding="async">';
    }

    function syncTrainingCommentAvatars(avatarUrl) {
        if (!panelEl) return;
        var resolvedAvatarUrl = String(avatarUrl || resolveSidebarAvatarUrl() || '').trim();
        if (!resolvedAvatarUrl) return;

        var avatarNodes = panelEl.querySelectorAll(
            '.tpl1-training-comment-composer .tpl1-training-comment-avatar-img, ' +
            '.tpl1-training-comment-item[data-is-mine="true"] .tpl1-training-comment-avatar-img'
        );

        avatarNodes.forEach(function (avatarEl) {
            avatarEl.setAttribute('src', resolvedAvatarUrl);
        });
    }

    function syncSidebarAvatar() {
        var avatarUrl = resolveSidebarAvatarUrl();
        var avatarHtml = buildSidebarAvatarHtml(avatarUrl);
        originalSideAvatarHtml = avatarHtml;
        userAvatarHtml = avatarHtml;
        if (sideAvatarEl) {
            sideAvatarEl.innerHTML = avatarHtml;
        }
        if (accountAvatarImageEl) {
            accountAvatarImageEl.setAttribute('src', avatarUrl);
        }
        syncTrainingCommentAvatars(avatarUrl);
    }

    function setAccountAvatarEditButtonBusy(isBusy) {
        if (!accountAvatarEditBtn) return;
        accountAvatarEditBtn.disabled = Boolean(isBusy);
        accountAvatarEditBtn.setAttribute('aria-disabled', isBusy ? 'true' : 'false');
    }

    function showAccountAvatarFeedback(message, tone, timeoutMs) {
        var text = String(message || '').trim();
        if (!text) return;

        if (!accountSaveMessage) {
            if (tone === 'error') {
                window.alert(text);
            }
            return;
        }

        if (accountAvatarFeedbackTimer) {
            window.clearTimeout(accountAvatarFeedbackTimer);
            accountAvatarFeedbackTimer = null;
        }

        accountSaveMessage.textContent = text;
        accountSaveMessage.classList.add('show');

        if (tone === 'error') {
            accountSaveMessage.style.color = '#ba2f2f';
        } else if (tone === 'info') {
            accountSaveMessage.style.color = '#6f7aa6';
        } else {
            accountSaveMessage.style.color = '#1d9f5f';
        }

        if (typeof timeoutMs === 'number' && timeoutMs > 0) {
            accountAvatarFeedbackTimer = window.setTimeout(function () {
                if (!accountSaveMessage) return;
                accountSaveMessage.classList.remove('show');
                accountSaveMessage.style.color = '';
                accountSaveMessage.textContent = 'Saved.';
                accountAvatarFeedbackTimer = null;
            }, timeoutMs);
        }
    }

    async function uploadAccountAvatar(file) {
        if (!file || accountAvatarUploadInFlight) return;

        accountAvatarUploadInFlight = true;
        setAccountAvatarEditButtonBusy(true);
        showAccountAvatarFeedback('Uploading avatar...', 'info');

        try {
            var formData = new FormData();
            formData.append('photo_2x2', file);

            var response = await fetch(onboardingApi.accountAvatarUploadUrl, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: formData
            });

            var payload = {};
            try {
                payload = await response.json();
            } catch (jsonError) {
                payload = {};
            }

            if (!response.ok || !payload.ok) {
                var fieldErrors = payload && payload.field_errors ? payload.field_errors : {};
                var errorMessage = fieldErrors.photo_2x2;
                if (Array.isArray(errorMessage)) {
                    errorMessage = errorMessage[0];
                }
                if (!errorMessage) {
                    errorMessage = payload.message || 'Unable to upload avatar right now.';
                }
                showAccountAvatarFeedback(String(errorMessage || 'Unable to upload avatar right now.'), 'error', 3200);
                return;
            }

            applyOnboardingProfileData(payload.data || {});
            showAccountAvatarFeedback('Avatar updated.', 'success', 2200);
        } catch (error) {
            showAccountAvatarFeedback('Upload failed. Please try again.', 'error', 3200);
        } finally {
            accountAvatarUploadInFlight = false;
            setAccountAvatarEditButtonBusy(false);
        }
    }

    function wireAccountAvatarUploadInput(input) {
        if (!input || input.dataset.avatarUploadWired === '1') {
            return;
        }

        input.addEventListener('change', function () {
            var file = input.files && input.files[0] ? input.files[0] : null;
            input.value = '';
            if (!file) return;
            uploadAccountAvatar(file);
        });

        input.dataset.avatarUploadWired = '1';
    }

    function getAccountAvatarUploadInput() {
        if (accountAvatarUploadInputEl && accountAvatarUploadInputEl.isConnected) {
            wireAccountAvatarUploadInput(accountAvatarUploadInputEl);
            return accountAvatarUploadInputEl;
        }

        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.jpg,.jpeg,.png,image/jpeg,image/png';
        input.hidden = true;
        input.tabIndex = -1;
        input.setAttribute('aria-hidden', 'true');

        document.body.appendChild(input);
        accountAvatarUploadInputEl = input;
        wireAccountAvatarUploadInput(accountAvatarUploadInputEl);
        return accountAvatarUploadInputEl;
    }

    function syncRuntimeAvatarFromOnboardingDocs() {
        if (!root) return;
        var docs = onboardingProfileData.agent_requirement_documents || {};
        var uploaded2x2Url = fileMetaUrl(docs.photo_2x2);
        if (!uploaded2x2Url) return;
        root.setAttribute('data-user-icon-url', uploaded2x2Url);
        syncSidebarAvatar();
    }

    function reviewDocumentsListMarkup() {
        var requiredDocs = [
            { label: 'Valid Government ID (Primary)', meta: onboardingProfileData.agent_requirement_documents.valid_government_id_1 },
            { label: 'Valid Government ID (Secondary)', meta: onboardingProfileData.agent_requirement_documents.valid_government_id_2 },
            { label: 'TIN Verification', meta: onboardingProfileData.agent_requirement_documents.tin_verification },
            { label: '2x2 Picture', meta: onboardingProfileData.agent_requirement_documents.photo_2x2 },
            { label: '1x1 Picture', meta: onboardingProfileData.agent_requirement_documents.photo_1x1 },
        ];

        var items = requiredDocs.map(function (doc) {
            var fileName = fileMetaName(doc.meta);
            var labelHtml = '<strong>' + escapeHtmlAttr(doc.label + ':') + '</strong>';
            var valueText = fileName || 'Not uploaded yet';
            return '<li><span aria-hidden="true">📎</span><span>' + labelHtml + ' ' + escapeHtmlAttr(valueText) + '</span></li>';
        });

        return items.join('');
    }

    function buildCurrentUserDisplayName() {
        var fullName = (String(onboardingPrefill.firstName || '') + ' ' + String(onboardingPrefill.lastName || '')).replace(/\s+/g, ' ').trim();
        if (fullName) return fullName;

        var firstName = String(onboardingPrefill.firstName || '').trim();
        if (firstName) return firstName;

        var email = String(onboardingPrefill.email || '').trim();
        if (email) return email;

        return String(currentUserName || 'Agent').trim() || 'Agent';
    }

    function syncProfileRuntimeViews(options) {
        options = options || {};

        currentUserName = buildCurrentUserDisplayName();
        root.setAttribute('data-user-name', currentUserName);
        root.setAttribute('data-account-first-name', onboardingPrefill.firstName || '');
        root.setAttribute('data-account-last-name', onboardingPrefill.lastName || '');
        root.setAttribute('data-account-email', onboardingPrefill.email || '');
        root.setAttribute('data-account-phone', onboardingPrefill.phoneNumber || '');
        root.setAttribute('data-account-birthdate', onboardingPrefill.birthdate || '');        root.setAttribute('data-account-gender', onboardingPrefill.gender || '');

        if (sideUserNameEl) {
            sideUserNameEl.textContent = currentUserName;
        }

        syncSidebarAvatar();

        if (sideProfileEl) {
            sideProfileEl.setAttribute('aria-label', currentUserName + ' profile actions');
        }

        if (appEl) {
            syncSidebarProfileTooltips(appEl.classList.contains('sidebar-collapsed'));
        }

        if (options.refreshPanel) {
            renderAll({ animatePanel: false });
        }
    }

    function applyOnboardingProfileData(data, options) {
        data = data || {};
        var account = data.account || {};

        onboardingPrefill.firstName = String(account.first_name || onboardingPrefill.firstName || '').trim();
        onboardingPrefill.lastName = String(account.last_name || onboardingPrefill.lastName || '').trim();
        onboardingPrefill.email = String(account.email || onboardingPrefill.email || '').trim();
        onboardingPrefill.phoneNumber = String(account.phone_number || onboardingPrefill.phoneNumber || '').trim();
        onboardingPrefill.birthdate = String(account.birthdate || onboardingPrefill.birthdate || '').trim();
        onboardingPrefill.gender = String(account.gender || onboardingPrefill.gender || '').trim();

        onboardingProfileData.residential_address = String(data.residential_address || '').trim();

        var docs = data.agent_requirement_documents || {};
        onboardingProfileData.agent_requirement_documents = {
            valid_government_id_1: docs.valid_government_id_1 || docs.proof_of_education || data.valid_government_id || null,
            valid_government_id_2: docs.valid_government_id_2 || docs.government_clearance_nbi || null,
            tin_verification: docs.tin_verification || null,
            photo_2x2: docs.photo_2x2 || null,
            photo_1x1: docs.photo_1x1 || null,
        };

        syncRuntimeAvatarFromOnboardingDocs();

        if (accountForm) {
            if (accountForm.elements.first_name) accountForm.elements.first_name.value = onboardingPrefill.firstName;
            if (accountForm.elements.last_name) accountForm.elements.last_name.value = onboardingPrefill.lastName;
            if (accountForm.elements.email) accountForm.elements.email.value = onboardingPrefill.email;
            if (accountForm.elements.phone_number) accountForm.elements.phone_number.value = onboardingPrefill.phoneNumber;
            if (accountForm.elements.birthdate) accountForm.elements.birthdate.value = onboardingPrefill.birthdate;
            if (accountForm.elements.gender) accountForm.elements.gender.value = onboardingPrefill.gender;
        }

        syncProfileRuntimeViews({ refreshPanel: Boolean(options && options.refreshPanel) });
    }

    async function hydrateOnboardingProfileData() {
        try {
            var response = await fetch(onboardingApi.profileDataUrl, {
                method: 'GET',
                credentials: 'same-origin'
            });
            var payload = {};
            try {
                payload = await response.json();
            } catch (jsonError) {
                payload = {};
            }

            if (!response.ok || !payload.ok || !payload.data) {
                console.warn('Onboarding profile data fetch failed.', {
                    status: response.status,
                    message: payload.message || 'Unknown onboarding profile data load failure.'
                });
                return;
            }

            applyOnboardingProfileData(payload.data);
        } catch (error) {
            console.warn('Onboarding profile data fetch failed.', error);
        }
    }

    function getPersistedDocMetaByInputId(inputId) {
        var fieldName = uploadFieldByInputId[inputId];
        if (!fieldName) return null;
        return onboardingProfileData.agent_requirement_documents[fieldName] || null;
    }

    function setUploadControlDisplay(inputId, labelText, actionText, hasFile) {
        var label = document.getElementById(inputId + '-label');
        var action = document.getElementById(inputId + '-action-text');
        var trigger = panelEl.querySelector('[data-upload-trigger="' + inputId + '"]');

        if (label) {
            label.textContent = labelText;
        }
        if (action) {
            action.textContent = actionText;
        }
        if (trigger) {
            trigger.classList.toggle('has-file', Boolean(hasFile));
        }
    }

    function getUploadStateForInput(inputId, input, defaultDescription) {
        if (input && input.files && input.files.length > 0) {
            return {
                labelText: 'Selected: ' + input.files[0].name,
                actionText: input.files[0].name,
                hasFile: true
            };
        }

        var persisted = getPersistedDocMetaByInputId(inputId);
        var persistedName = fileMetaName(persisted);
        if (persistedName) {
            return {
                labelText: 'Uploaded: ' + persistedName,
                actionText: persistedName,
                hasFile: true
            };
        }

        return {
            labelText: defaultDescription,
            actionText: 'Choose File',
            hasFile: false
        };
    }

    function getDefaultUploadDescription(inputId) {
        var label = document.getElementById(inputId + '-label');
        if (!label) return 'Upload required file.';
        return label.getAttribute('data-default-label') || 'Upload required file.';
    }

    function firstFieldError(fieldErrors) {
        if (!fieldErrors || typeof fieldErrors !== 'object') return '';
        for (var key in fieldErrors) {
            if (Object.prototype.hasOwnProperty.call(fieldErrors, key) && fieldErrors[key]) {
                return String(fieldErrors[key]);
            }
        }
        return '';
    }

    function buildUploadErrorMessage(response, payload, fallback) {
        var status = response && typeof response.status === 'number' ? response.status : null;
        var message = payload && payload.message ? String(payload.message) : '';
        var fieldError = firstFieldError(payload && payload.field_errors ? payload.field_errors : null);
        var detail = fieldError || message || fallback;
        if (status) {
            return 'HTTP ' + status + ': ' + detail;
        }
        return detail;
    }

    function uploadConstraintHint() {
        return 'Allowed files: .pdf, .jpg, .jpeg, .png (max 10MB). 2x2 and 1x1 pictures accept .jpg, .jpeg, .png only.';
    }

    function getModuleState(index) {
        return {
            completed: completed.has(index),
            locked: isLocked(index),
            active: index === current
        };
    }

    function getModuleStatusIcon(moduleState) {
        if (moduleState.completed) return icon('done');
        if (moduleState.locked) return icon('lock');
        return icon('active');
    }

    function getModuleStatusLabel(moduleState) {
        if (moduleState.completed) return 'completed';
        if (moduleState.locked) return 'locked';
        return 'pending';
    }

    function renderModuleItem(step, index, moduleState, videoSrc) {
        var cls = ['tpl1-step', moduleState.completed ? 'done' : '', moduleState.locked ? 'locked' : '', moduleState.active ? 'active' : ''].join(' ');
        var stateIcon = getModuleStatusIcon(moduleState);
        var statusLabel = getModuleStatusLabel(moduleState);
        var safeLabel = escapeHtmlAttr(step.title + ' - ' + statusLabel);
        var href = step.type === 'video' && step.contentId ? '#' + step.contentId : '';
        var currentAttr = moduleState.active ? ' aria-current="step"' : '';

        if (step.type === 'video' && step.contentId) {
            return '<a class="' + cls + '" href="' + href + '" data-step="' + index + '" data-video-src="' + videoSrc + '" data-content-id="' + step.contentId + '" title="' + safeLabel + '" aria-label="' + safeLabel + '"' + currentAttr + '>' +
                '<span class="tpl1-step-inner"><span class="tpl1-icon">' + stateIcon + '</span><span class="tpl1-step-label">' + step.title + '</span></span>' +
            '</a>';
        }

        return '<button class="' + cls + '" type="button" data-step="' + index + '" data-video-src="' + videoSrc + '" title="' + safeLabel + '" aria-label="' + safeLabel + '"' + currentAttr + ' ' + (moduleState.locked ? 'disabled aria-disabled="true"' : '') + '>' +
            '<span class="tpl1-step-inner"><span class="tpl1-icon">' + stateIcon + '</span><span class="tpl1-step-label">' + step.title + '</span></span>' +
        '</button>';
    }

    function renderSidebar() {
        var map = groupMap();
        var keys = getOrderedGroupKeys(map);

        if (!keys.length) {
            groupsEl.innerHTML = '';
            return;
        }

        var openIdx = openGroups.size ? Array.from(openGroups)[0] : 0;
        openGroups.clear();
        openGroups.add(openIdx);

        groupsEl.innerHTML = keys.map(function (groupTitle) {
            var gIdx = keys.indexOf(groupTitle);
            var indices = map[groupTitle];
            var doneCount = indices.filter(function (idx) { return completed.has(idx); }).length;
            var reviewIdx = reviewStepIndex();
            var reviewGroupName = steps[reviewIdx] ? steps[reviewIdx].group : '';
            var isReviewGroup = groupTitle === reviewGroupName;
            var isAgentFoundationGroup = groupTitle === AGENT_FOUNDATION_GROUP_TITLE;

            var stepButtons = '';
            if (isAgentFoundationGroup) {
                var moduleBuckets = {};
                var moduleOrder = [];

                indices.forEach(function (idx) {
                    var step = steps[idx] || {};
                    var moduleTitle = step.moduleTitle ? step.moduleTitle : 'Training Videos';
                    var moduleId = getTrainingStepModuleId(step) || moduleTitle;
                    var moduleBucketKey = String(moduleId) + '::' + String(moduleTitle);

                    if (!moduleBuckets[moduleBucketKey]) {
                        moduleBuckets[moduleBucketKey] = {
                            moduleId: moduleId,
                            moduleTitle: moduleTitle,
                            indices: [],
                            completed: 0,
                            total: 0
                        };
                        moduleOrder.push(moduleBucketKey);
                    }

                    moduleBuckets[moduleBucketKey].indices.push(idx);
                    moduleBuckets[moduleBucketKey].total += 1;
                    if (completed.has(idx)) {
                        moduleBuckets[moduleBucketKey].completed += 1;
                    }
                });

                var activeModuleId = getActiveTrainingModuleId();

                stepButtons = moduleOrder.map(function (moduleBucketKey, moduleIdx) {
                    var bucket = moduleBuckets[moduleBucketKey];
                    var moduleKey = String(moduleIdx) + '::' + moduleBucketKey;
                    var moduleTitle = bucket && bucket.moduleTitle ? bucket.moduleTitle : 'Training Videos';
                    var isActiveModule = bucket.moduleId === activeModuleId;
                    var moduleDisplayTitle = formatAgentFoundationModuleTitle(moduleTitle);
                    var moduleState = {
                        completed: bucket.total > 0 && bucket.completed >= bucket.total,
                        locked: bucket.indices.every(function (stepIndex) { return isLocked(stepIndex); }),
                        active: isActiveModule
                    };
                    var moduleClass = ['tpl1-step', 'tpl1-training-module-item', moduleState.completed ? 'done' : '', moduleState.locked ? 'locked' : '', moduleState.active ? 'active' : ''].join(' ');
                    var moduleStatusIcon = getModuleStatusIcon(moduleState);
                    var moduleStatusLabel = getModuleStatusLabel(moduleState);
                    var moduleAriaLabel = escapeHtmlAttr(moduleDisplayTitle + ' - ' + moduleStatusLabel);
                    var moduleCurrentAttr = moduleState.active ? ' aria-current="step"' : '';
                    var moduleDisabledAttr = moduleState.locked ? ' disabled aria-disabled="true"' : '';

                    return '<button class="' + moduleClass + '" type="button" data-training-module="' + escapeHtmlAttr(moduleKey) + '" data-training-module-id="' + escapeHtmlAttr(bucket.moduleId) + '" data-training-module-title="' + escapeHtmlAttr(moduleTitle) + '" title="' + moduleAriaLabel + '" aria-label="' + moduleAriaLabel + '"' + moduleCurrentAttr + moduleDisabledAttr + '>' +
                        '<span class="tpl1-step-inner">' +
                            '<span class="tpl1-icon" aria-hidden="true">' + moduleStatusIcon + '</span>' +
                            '<span class="tpl1-meta"><span class="tpl1-step-title">' + moduleDisplayTitle + '</span><span>' + bucket.completed + ' / ' + bucket.total + ' complete</span></span>' +
                        '</span>' +
                    '</button>';
                }).join('');
            } else {
                stepButtons = indices.map(function (idx) {
                    var step = steps[idx];
                    var videoSrc = videoByStepIndex[idx] || '';
                    return renderModuleItem(step, idx, getModuleState(idx), videoSrc);
                }).join('');
            }

            if (isReviewGroup) {
                var congratsLocked = isCongratsLocked();
                var congratsActive = isCongratsPanelActive();
                var congratsDone = !congratsLocked;
                var congratsClass = ['tpl1-step', 'tpl1-step-congrats', congratsDone ? 'done' : '', congratsLocked ? 'locked' : '', congratsActive ? 'active' : ''].join(' ');
                var congratsIcon = congratsDone ? icon('done') : icon('lock');
                var congratsLabel = congratsDone ? 'Congratulations - completed' : 'Congratulations - locked';
                stepButtons += '<button class="' + congratsClass + '" type="button" data-ui-panel="congrats" title="' + congratsLabel + '" aria-label="' + congratsLabel + '" ' + (congratsLocked ? 'disabled aria-disabled="true"' : '') + '>' +
                    '<span class="tpl1-step-inner"><span class="tpl1-icon">' + congratsIcon + '</span><span class="tpl1-step-label">Congratulations</span></span>' +
                '</button>';
            }

            return '<section class="tpl1-group ' + (openGroups.has(gIdx) ? 'open' : '') + '">' +
                '<button class="tpl1-group-btn" type="button" data-group="' + gIdx + '" aria-expanded="' + (openGroups.has(gIdx) ? 'true' : 'false') + '">' +
                    '<div class="tpl1-meta"><strong>' + groupTitle + '</strong><span>' + doneCount + ' / ' + indices.length + ' complete</span></div>' +
                    '<span class="tpl1-chevron" aria-hidden="true"></span>' +
                '</button>' +
                '<div class="tpl1-steps">' + stepButtons + '</div>' +
            '</section>';
        }).join('');

        function syncGroupHeights() {
            groupsEl.querySelectorAll('.tpl1-subgroup').forEach(function (subgroupEl) {
                var subPanel = subgroupEl.querySelector('.tpl1-substeps');
                if (!subPanel) return;
                subgroupEl.style.setProperty('--substeps-max-height', subPanel.scrollHeight + 'px');
            });

            groupsEl.querySelectorAll('.tpl1-group').forEach(function (groupEl) {
                var panel = groupEl.querySelector('.tpl1-steps');
                if (!panel) return;
                groupEl.style.setProperty('--steps-max-height', panel.scrollHeight + 'px');
            });
        }

        function setGroupOpenState(groupEl, open) {
            var button = groupEl.querySelector('.tpl1-group-btn');
            groupEl.classList.toggle('open', open);
            if (button) {
                button.setAttribute('aria-expanded', open ? 'true' : 'false');
            }
        }

        syncGroupHeights();
        window.requestAnimationFrame(syncGroupHeights);

        groupsEl.querySelectorAll('[data-group]').forEach(function (el) {
            el.addEventListener('click', function () {
                var idx = Number(el.getAttribute('data-group'));
                var groups = Array.from(groupsEl.querySelectorAll('.tpl1-group'));
                var target = groups[idx];
                if (!target) return;

                syncGroupHeights();

                var willOpen = !target.classList.contains('open');
                groups.forEach(function (groupEl, groupIdx) {
                    var shouldOpen = willOpen && groupIdx === idx;
                    setGroupOpenState(groupEl, shouldOpen);
                });

                openGroups.clear();
                if (willOpen) {
                    openGroups.add(idx);
                }
            });
        });

        groupsEl.querySelectorAll('[data-training-module]').forEach(function (el) {
            el.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();

                var target = event.currentTarget;
                var moduleId = target.getAttribute('data-training-module-id') || '';
                if (!moduleId) return;

                selectedTrainingModuleId = moduleId;

                var targetStepIndex = getPreferredTrainingStepIndexForModuleId(moduleId);
                if (targetStepIndex >= 0) {
                    var shouldAnimatePanel = targetStepIndex !== current;
                    showCongratsPanel = false;
                    current = targetStepIndex;
                    syncOpenGroupForIndex(current);
                    renderAll({ animatePanel: shouldAnimatePanel });
                    if (isMobileLayout()) {
                        setMobileSheetOpen(false);
                    }
                }
            });
        });

        groupsEl.querySelectorAll('[data-step]').forEach(function (el) {
            el.addEventListener('click', function (event) {
                event.preventDefault();

                var targetEl = event.currentTarget;
                var idx = Number(targetEl.getAttribute('data-step'));
                if (isLocked(idx)) return;
                var targetId = (targetEl.getAttribute('href') || '').replace(/^#/, '') || targetEl.getAttribute('data-content-id') || '';
                var videoSrc = getVideoSrcFromContentId(targetId, targetEl.getAttribute('data-video-src'));
                var shouldAnimatePanel = idx !== current;
                var key = steps[idx] ? steps[idx].group : '';
                var groupIdx = keys.indexOf(key);
                if (groupIdx >= 0) {
                    openGroups.clear();
                    openGroups.add(groupIdx);
                }
                showCongratsPanel = false;
                current = idx;
                selectedTrainingModuleId = getTrainingStepModuleId(steps[idx]) || selectedTrainingModuleId;
                renderAll({ animatePanel: shouldAnimatePanel });
                if (isMobileLayout()) {
                    setMobileSheetOpen(false);
                }
            });
        });

        groupsEl.querySelectorAll('[data-ui-panel="congrats"]').forEach(function (el) {
            el.addEventListener('click', function (event) {
                event.preventDefault();
                if (isCongratsLocked()) return;
                var reviewIdx = reviewStepIndex();
                var key = steps[reviewIdx] ? steps[reviewIdx].group : '';
                var groupIdx = keys.indexOf(key);
                if (groupIdx >= 0) {
                    openGroups.clear();
                    openGroups.add(groupIdx);
                }
                showCongratsPanel = true;
                renderAll({ animatePanel: true });
                if (isMobileLayout()) {
                    setMobileSheetOpen(false);
                }
            });
        });
    }

    function isMobileLayout() {
        return mobileLayoutQuery.matches;
    }

    function syncMobileA11y() {
        if (!sidebarEl) return;
        if (!isMobileLayout()) {
            sidebarEl.removeAttribute('aria-hidden');
            return;
        }
        sidebarEl.setAttribute('aria-hidden', String(!isMobileSheetOpen));
    }

    function setScrollLock(locked) {
        document.documentElement.classList.toggle('tpl1-no-scroll', locked);
        document.body.classList.toggle('tpl1-no-scroll', locked);
    }

    function setMobileSheetOpen(open) {
        if (!appEl) return;
        if (!isMobileLayout()) {
            open = false;
        }

        isMobileSheetOpen = Boolean(open);
        appEl.classList.toggle('mobile-sheet-open', isMobileSheetOpen);

        if (sideToggleBtn && isMobileLayout()) {
            sideToggleBtn.setAttribute('aria-expanded', String(isMobileSheetOpen));
            sideToggleBtn.setAttribute('aria-label', isMobileSheetOpen ? 'Close steps' : 'Open steps');
        }
        if (mobileBackdrop) {
            mobileBackdrop.hidden = !isMobileSheetOpen;
        }

        setScrollLock(isMobileSheetOpen);
        syncMobileA11y();
    }

    function onMobileLayoutChange() {
        if (!isMobileLayout()) {
            setMobileSheetOpen(false);
        } else {
            syncMobileA11y();
        }
    }

    async function completeStep(index, options) {
        options = options || {};
        var showAlertOnError = options.showAlertOnError !== false;
        var step = steps[index];
        if (!step) return;

        if (options.skipServerSave === true) {
            var previousCurrentLocal = current;
            completed.add(index);
            if (index < steps.length - 1 && !isLocked(index + 1)) {
                current = index + 1;
            }
            syncSelectedTrainingModuleForIndex(current);
            syncOpenGroupForIndex(current);
            writeLocalCompletedKeys();
            notifyModulesCompletedIfChanged();
            renderAll({ animatePanel: current !== previousCurrentLocal });
            return true;
        }

        var requestBody = { step_key: step.storageKey };
        if (options.extraPayload && typeof options.extraPayload === 'object') {
            for (var key in options.extraPayload) {
                if (Object.prototype.hasOwnProperty.call(options.extraPayload, key)) {
                    requestBody[key] = options.extraPayload[key];
                }
            }
        }

        var isFinalTrainingStep = isFinalAgentFoundationCompletionClick(index);

        _pendingSave = fetch('/portal-onboarding/step-complete/', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(requestBody)
        })
        .then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (payload) {
                // Persist payload for downstream UI logic (certificate feedback, etc.)
                try { _lastStepCompletePayload = payload || null; } catch (e) { _lastStepCompletePayload = null; }
                if (!response.ok || !payload.ok) {
                    throw {
                        status: response.status,
                        code: payload.code || 'ONBOARDING_SAVE_FAILED',
                        detail: payload.detail || payload.message || 'Unknown onboarding save failure.'
                    };
                }
            });
        });

        try {
            await _pendingSave;

            var previousCurrent = current;
            completed.add(index);
            if (index < steps.length - 1 && !isLocked(index + 1)) {
                current = index + 1;
            }
            syncSelectedTrainingModuleForIndex(current);
            syncOpenGroupForIndex(current);
            writeLocalCompletedKeys();
            notifyModulesCompletedIfChanged();
            renderAll({ animatePanel: current !== previousCurrent });
            if (isFinalTrainingStep) {
                triggerAgentFoundationCompletionEmail().catch(function (err) {
                    console.warn('[onboarding] completion email trigger failed', err);
                });
            }
            return true;
        } catch (error) {
            // Operational note: if code === ONBOARDING_DB_NOT_READY, run:
            // python manage.py makemigrations app
            // python manage.py migrate
            console.warn('Onboarding step save failed.', {
                status: error && typeof error.status !== 'undefined' ? error.status : null,
                code: error && error.code ? error.code : 'ONBOARDING_SAVE_FAILED',
                detail: error && error.detail ? error.detail : (error && error.message ? error.message : String(error))
            });
            if (showAlertOnError) {
                window.alert('Progress could not be saved. Please try again.');
            }
            return false;
        } finally {
            _pendingSave = null;
        }
    }

    function trainingMarkup(step, index) {
        var videoIndices = getTrainingVideoStepIndices();
        var completedVideos = videoIndices.filter(function (idx) { return completed.has(idx); }).length;
        var playableVideo = getCurrentPlayableVideoIndex();
        var activeModuleId = getActiveTrainingModuleId();
        var allowTrainingNextBypass = Boolean(step && step.group === AGENT_FOUNDATION_GROUP_TITLE);
        var activeModuleIndices = [];
        var activeModuleTitle = 'Training Module';

        videoIndices.forEach(function (idx) {
            var item = steps[idx];
            if (getTrainingStepModuleId(item) !== activeModuleId) {
                return;
            }
            activeModuleIndices.push(idx);
            activeModuleTitle = item.moduleTitle || activeModuleTitle;
        });

        var moduleCompleted = activeModuleIndices.filter(function (idx) {
            return completed.has(idx);
        }).length;
        var isModuleComplete = activeModuleIndices.length > 0 && moduleCompleted === activeModuleIndices.length;
        var moduleCommentState = getTrainingModuleCommentState(activeModuleId);
        var moduleCommentId = 'betaTrainingComment_' + String(activeModuleId || activeModuleTitle).replace(/[^a-z0-9]+/ig, '_').toLowerCase();
        var moduleAuthorName = currentUserName || 'Agent';
        var moduleAuthorInitials = getNameInitials(moduleAuthorName);
        moduleCommentState.comments = (Array.isArray(moduleCommentState.comments) ? moduleCommentState.comments : [])
            .map(function (item) { return normalizeTrainingCommentEntry(item, moduleAuthorName); })
            .filter(function (item) { return !!item; });
        var commentItemsHtml = moduleCommentState.comments.map(function (commentObj) {
            return renderTrainingCommentItem(commentObj, moduleAuthorName);
        }).join('');

        // If this module is the VIDEO LOOM group, remove deprecated UI (comments/sequential banner).
        var isModule13 = activeModuleIndices.length && steps[activeModuleIndices[0]] &&
            steps[activeModuleIndices[0]].group === 'VIDEO LOOM';

        var displayIndices = activeModuleIndices;

        var moduleCards = displayIndices.map(function (idx, order) {
            var item = steps[idx];
            var status = getTrainingCardStatus(idx);
            var thumbnailSrc = resolveStepThumbnailSrc(item);
            var isLocked = status === 'locked';
            var statusLabel = status === 'completed' ? 'Completed' : (status === 'unlocked' ? 'Unlocked' : 'Locked');
            var badgeClass = status === 'completed' ? 'is-completed' : (status === 'unlocked' ? 'is-unlocked' : 'is-locked');
            var numberLabel = String(order + 1);
            var durationLabel = item.durationLabel || 'Preview';
            return '<button class="tpl1-training-card ' + (isLocked ? 'is-locked' : '') + '" type="button" data-training-card="' + idx + '" ' +
                'aria-label="' + escapeHtmlAttr(item.title + ' ' + statusLabel) + '" ' + (isLocked ? 'disabled aria-disabled="true"' : '') + '>' +
                '<div class="tpl1-training-thumb" style="background-image:url(' + escapeHtmlAttr(thumbnailSrc) + ')">' +
                    '<span class="tpl1-training-index">' + numberLabel + '</span>' +
                    '<span class="tpl1-training-play" aria-hidden="true">' +
                        '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 6.5v11l9-5.5z"></path></svg>' +
                    '</span>' +
                    '<span class="tpl1-training-duration">' + escapeHtmlAttr(durationLabel) + '</span>' +
                    '<span class="tpl1-training-status ' + badgeClass + '">' +
                        (status === 'completed'
                            ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"></path></svg>'
                            : '') +
                        (status === 'locked'
                            ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>'
                            : '') +
                        escapeHtmlAttr(statusLabel) +
                    '</span>' +
                '</div>' +
                '<div class="tpl1-training-meta">' +
                    '<h4>' + escapeHtmlAttr(item.title) + '</h4>' +
                    '<p>' + escapeHtmlAttr(activeModuleTitle) + '</p>' +
                '</div>' +
            '</button>';
        }).join('');



        // Get current user icon for comment composer
        var currentUserName = (root && root.dataset.userName) || 'Agent';
        var composerAvatarSrc = resolveSidebarAvatarUrl();
        if (!composerAvatarSrc) {
            composerAvatarSrc = generateDefaultAvatarDataUrl(currentUserName);
        }
        if (!composerAvatarSrc) {
            composerAvatarSrc = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"%3E%3Crect fill="%234285F4" width="128" height="128"/%3E%3Ctext x="50%" y="50%" font-size="56" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle"%3EAG%3C/text%3E%3C/svg%3E';
        }

        var moduleFooter = isModule13
            ? ''
            : ('<div class="tpl1-training-module-footer" data-training-module-footer="1" data-module-complete="' + (isModuleComplete ? 'true' : 'false') + '">' +
            '<button type="button" class="tpl1-training-comment-toggle" data-training-comment-toggle="1" ' + (isModuleComplete ? '' : 'disabled aria-disabled="true"') + ' aria-controls="' + escapeHtmlAttr(moduleCommentId) + '" aria-expanded="' + (isModuleComplete && moduleCommentState.isOpen ? 'true' : 'false') + '">Comments</button>' +
            '<div class="tpl1-training-comment-panel' + (isModuleComplete && moduleCommentState.isOpen ? ' is-open' : '') + '" data-training-comment-panel="1" id="' + escapeHtmlAttr(moduleCommentId) + '">' +
                '<div class="tpl1-training-comment-composer">' +
                    '<div class="tpl1-training-comment-avatar" aria-hidden="true">' +
                        '<img class="tpl1-training-comment-avatar-img" src="' + escapeHtmlAttr(composerAvatarSrc) + '" alt="" loading="lazy" decoding="async">' +
                        '<span class="tpl1-training-avatar-coin" data-training-avatar-coin="1"></span>' +
                    '</div>' +
                    '<div class="tpl1-training-comment-field-wrap">' +
                        '<input class="tpl1-training-comment-input" data-training-comment-input="1" id="' + escapeHtmlAttr(moduleCommentId + '_input') + '" type="text" maxlength="500" placeholder="Write your comment here..." value="' + escapeHtmlAttr(moduleCommentState.text || '') + '" ' + (isModuleComplete ? '' : 'disabled') + ' />' +
                        '<button type="button" class="tpl1-training-comment-submit" data-training-comment-submit="1" aria-label="Post comment" ' + (isModuleComplete ? '' : 'disabled aria-disabled="true"') + '>' +
                            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13"></path><path d="M22 2 15 22 11 13 2 9 22 2z"></path></svg>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
                '<div class="tpl1-training-reply-bar" data-training-reply-bar="1" aria-live="polite">' +
                    '<div class="tpl1-training-reply-bar-main">' +
                        '<span class="tpl1-reply-bar-title">Replying to</span>' +
                        '<span class="tpl1-reply-bar-name" data-training-reply-name="1"></span>' +
                        '<span class="tpl1-reply-bar-preview" data-training-reply-preview="1"></span>' +
                    '</div>' +
                    '<button type="button" class="tpl1-reply-bar-cancel" data-training-reply-cancel="1" aria-label="Cancel reply">Cancel</button>' +
                '</div>' +
                '<ul class="tpl1-training-comment-list" data-training-comment-list="1">' + commentItemsHtml + '</ul>' +
                '<p class="tpl1-training-comment-hint">' + (isModuleComplete ? 'Tip: Right-click any comment to reply. Edit/Delete are only for your own comments.' : 'Complete this module to unlock comments.') + '</p>' +
                '<div class="tpl1-training-comment-menu" data-training-comment-menu="1" role="menu" aria-hidden="true">' +
                    '<button type="button" class="tpl1-training-comment-menu-item" data-training-comment-menu-action="reply" data-ctx="reply" role="menuitem">' +
                        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-1a4 4 0 0 0-4-4H4"></path></svg>' +
                        '<span>Reply</span>' +
                    '</button>' +
                    '<div class="tpl1-training-comment-menu-divider" data-ctx="divider" aria-hidden="true"></div>' +
                    '<button type="button" class="tpl1-training-comment-menu-item" data-training-comment-menu-action="edit" data-ctx="edit" role="menuitem">' +
                        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg>' +
                        '<span>Edit comment</span>' +
                    '</button>' +
                    '<button type="button" class="tpl1-training-comment-menu-item is-danger" data-training-comment-menu-action="delete" data-ctx="delete" role="menuitem">' +
                        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>' +
                        '<span>Delete comment</span>' +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</div>');

        var moduleSection = '<section class="tpl1-training-module">' +
            '<div class="tpl1-training-head tpl1-training-module-head">' +
                '<div>' +
                    '<h4>' + escapeHtmlAttr(activeModuleTitle) + '</h4>' +
                    '<p>' + moduleCompleted + ' / ' + activeModuleIndices.length + ' completed</p>' +
                '</div>' +
            '</div>' +
            '<div class="tpl1-training-grid" data-training-current="' + playableVideo + '">' + moduleCards + '</div>' +
            moduleFooter +
        '</section>';

        return '<div class="tpl1-grid">' +
            '<section class="tpl1-training-shell">' +
                '<div class="tpl1-training-head">' +
                    '<div>' +
                        '<h3>Training Modules</h3>' +
                        '<p>Follow the module sequence from top to bottom. Only the unlocked video can unlock the next step.</p>' +
                    '</div>' +
                    '<span class="tpl1-training-progress-pill">' + completedVideos + '/' + videoIndices.length + ' completed</span>' +
                '</div>' +
                (isModule13 ? '' : ('<div class="tpl1-info-banner" role="status" aria-live="polite">' +
                    '<span class="tpl1-info-icon" aria-hidden="true">' +
                        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="M12 8h.01"></path><path d="M11 12h1v4h1"></path></svg>' +
                    '</span>' +
                    '<span>Sequential unlock is active. You can open completed videos anytime, while only the unlocked video can be completed to unlock the next one.</span>' +
                '</div>')) +
                moduleSection +
            '</section>' +
            tpl1Footer(
                'Finish training in order to unlock account activation.',
                '<button class="tpl1-btn" type="button" id="betaPrev" ' + (index === 0 ? 'disabled' : '') + '>Prev</button>',
                '<button class="tpl1-btn primary" type="button" id="betaNext" ' + ((completed.has(index) || allowTrainingNextBypass) ? '' : 'disabled') + '>Next</button>'
            ) +
        '</div>';
    }

    function videoLoomMarkup(step, index) {
        if (!step || step.type !== 'video' || step.group !== 'VIDEO LOOM') {
            return trainingMarkup(step, index);
        }

        function slugifyId(value) {
            return String(value || '')
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+/, '')
                .replace(/-+$/, '');
        }

        var contentId = String(step.contentId || '').trim();
        if (!contentId) {
            contentId = slugifyId(step.title);
        }
        var videoSrc = getVideoSrcFromContentId(contentId, step.videoSrc);
        var resolvedVideoSrc = resolvePossibleDriveUrl(videoSrc) || videoSrc;
        var thumbSrc = getThumbnailSrcFromContentId(contentId, step.thumbnailSrc);
        if (!thumbSrc) {
            thumbSrc = buildTrainingThumbnailDataUri(step.title, 'video_loom');
        }

        return '<div class="tpl1-grid">' +
            '<section class="tpl1-training-shell">' +
                '<div class="tpl1-training-head">' +
                    '<div>' +
                        '<h3>Video Loom</h3>' +
                        '<p>Play the video below if you want, but you can advance when ready.</p>' +
                    '</div>' +
                '</div>' +
                '<section class="tpl1-video-loom-inline tpl1-video-loom-inline--solo" data-video-loom-solo="1">' +
                    '<div class="tpl1-video-loom-frame">' +
                        '<video class="tpl1-video-loom-video" controls playsinline preload="none" poster="' + escapeHtmlAttr(thumbSrc) + '" data-src="' + escapeHtmlAttr(resolvedVideoSrc) + '">' +
                            '' +
                            'Your browser does not support HTML5 video.' +
                        '</video>' +
                    '</div>' +
                    '<div class="tpl1-video-loom-meta">' +
                        '<h3 class="tpl1-video-loom-title">' + escapeHtmlAttr(step.title || 'Video') + '</h3>' +
                    '</div>' +
                '</section>' +
            '</section>' +
            tpl1Footer(
                '',
                '<button class="tpl1-btn" type="button" id="betaPrev" ' + (index === 0 ? 'disabled' : '') + '>Prev</button>',
                '<button class="tpl1-btn primary" type="button" id="betaNext">Next</button>'
            ) +
        '</div>';
    }

    function introMarkup(step, index) {
        var introChipLabel = formatStepCountLabel(steps.length);
        var welcomeVideoSrc = getVideoSrcFromContentId('welcome-orientation-video', '/static/Garcia%20Module11.mp4');
        var welcomeVideoPoster = getThumbnailSrcFromContentId('welcome-orientation-video', WELCOME_ORIENTATION_THUMBNAIL);
        return '<div class="tpl1-grid tpl1-intro-grid">' +
            '<section class="tpl1-intro-hero">' +
                '<div class="tpl1-intro-head">' +
                    '<div class="tpl1-intro-inline">' +
                        '<img class="tpl1-intro-logo" src="/static/images/innersparc.png" alt="Inner SPARC Logo">' +
                        '<h3>Welcome, ' + currentUserName + '</h3>' +
                    '</div>' +
                    '<span class="tpl1-intro-badge">' + introChipLabel + '</span>' +
                '</div>' +
            '</section>' +
            '<section class="tpl1-intro-layout" aria-label="Orientation details">' +
                '<section class="tpl1-intro-left" aria-label="Orientation video details">' +
                    '<article class="tpl1-intro-video-card" aria-label="Welcome orientation video">' +
                        '<section class="tpl1-video-loom-inline tpl1-video-loom-inline--solo">' +
                            '<div class="tpl1-video-loom-frame" style="background-image: url(' + escapeHtmlAttr(welcomeVideoPoster) + '); background-size: cover; background-position: center;">' +
                                '<video class="tpl1-video-loom-video tpl1-intro-video" id="betaIntroWelcomeVideo" controls playsinline preload="none" poster="' + escapeHtmlAttr(welcomeVideoPoster) + '" data-src="' + escapeHtmlAttr(welcomeVideoSrc) + '">' +
                                    'Your browser does not support the welcome video.' +
                                '</video>' +
                            '</div>' +
                            '<div class="tpl1-video-loom-meta">' +
                                '<h3 class="tpl1-video-loom-title">Welcome Orientation</h3>' +
                            '</div>' +
                        '</section>' +
                    '</article>' +
                    '<article class="tpl1-intro-about" aria-label="About this video">' +
                        '<h4>About this video</h4>' +
                        '<p>This orientation video will introduce you to our company culture, values, and what makes Inner SPARC special. You\'ll learn about our mission and get familiar with the team structure.</p>' +
                    '</article>' +
                '</section>' +
                '<section class="tpl1-intro-cards" aria-label="Orientation checklist">' +
                    '<article class="tpl1-intro-card tpl1-intro-card-main">' +
                        '<header class="tpl1-intro-card-header">' +
                            '<span class="tpl1-intro-card-header-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="M9.5 12.5 11 14l3.5-4"></path></svg></span>' +
                            '<strong>What you will do</strong>' +
                        '</header>' +
                        '<ul>' +
                            '<li><span class="tpl1-intro-item-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="12" height="10" rx="2"></rect><path d="m15 10 6-3v10l-6-3z"></path></svg></span><span><b>Watch training videos</b><small>Complete all orientation modules</small></span></li>' +
                            '<li><span class="tpl1-intro-item-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3"></circle><path d="M5 20a7 7 0 0 1 14 0"></path></svg></span><span><b>Complete profile details</b><small>Fill in your personal information</small></span></li>' +
                            '<li><span class="tpl1-intro-item-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"></path><path d="m7 8 5-5 5 5"></path><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path></svg></span><span><b>Upload required documents</b><small>Submit verification files</small></span></li>' +
                        '</ul>' +
                    '</article>' +
                    '<article class="tpl1-intro-card tpl1-intro-card-accent">' +
                        '<header class="tpl1-intro-card-header">' +
                            '<span class="tpl1-intro-card-header-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="m12 2 2.4 5 5.6.8-4 3.9.9 5.6-4.9-2.6-4.9 2.6.9-5.6-4-3.9 5.6-.8z"></path></svg></span>' +
                            '<strong>Prepare before starting</strong>' +
                        '</header>' +
                        '<ul>' +
                            '<li><span class="tpl1-intro-item-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M7 10h10"></path></svg></span><span><b>Valid government ID</b><small>Passport, driver\'s license, or ID card</small></span></li>' +
                            '<li><span class="tpl1-intro-item-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12a7 7 0 0 1 14 0"></path><path d="M8 12a4 4 0 0 1 8 0"></path><path d="M12 17h.01"></path></svg></span><span><b>Stable internet connection</b><small>Required for video streaming</small></span></li>' +
                            '<li><span class="tpl1-intro-item-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 3h8l4 4v14H7z"></path><path d="M15 3v5h5"></path><path d="M10 13h6"></path><path d="M10 17h6"></path></svg></span><span><b>Correct personal details</b><small>Ensure accuracy for verification</small></span></li>' +
                        '</ul>' +
                    '</article>' +
                '</section>' +
            '</section>' +
            tpl1Footer(
                '<label class="tpl1-intro-confirm"><input type="checkbox" id="betaIntroReadyCheck" ' + (completed.has(index) ? 'checked' : '') + '><span>I confirm I am ready to begin onboarding.</span></label>',
                '',
                '<button class="tpl1-btn primary" type="button" id="betaIntroNext" disabled>Continue to Training</button>'
            ) +
        '</div>';
    }

    function getVideoPlayIcon(isPlaying, size) {
        var iconSize = Number(size) || 18;
        return isPlaying
            ? '<svg viewBox="0 0 24 24" width="' + iconSize + '" height="' + iconSize + '" fill="currentColor" aria-hidden="true"><path d="M7 6h3v12H7zM14 6h3v12h-3z"></path></svg>'
            : '<svg viewBox="0 0 24 24" width="' + iconSize + '" height="' + iconSize + '" fill="currentColor" aria-hidden="true"><path d="M8 6.5v11l9-5.5z"></path></svg>';
    }

    function overviewMarkup(index) {
        var overviewTemplate = document.getElementById('tpl1OverviewAboutTemplate');
        var aboutCardHtml = overviewTemplate && overviewTemplate.innerHTML
            ? overviewTemplate.innerHTML.trim()
            : '<div class="tpl1-overview-stack" aria-label="Overview content">' +
                '<section class="tpl1-overview-hero" aria-labelledby="betaAboutInnerSparcTitle">' +
                    '<div class="tpl1-overview-hero-copy">' +
                        '<p class="tpl1-overview-kicker">Build Better With Proper Systems</p>' +
                        '<h3 id="betaAboutInnerSparcTitle">Inner SPARC Realty Corporation</h3>' +
                        '<p>We build communication and high-performing teams through clear systems, practices training, and connected community.</p>' +
                        '<div class="tpl1-overview-proof-list" aria-label="Overview benefits">' +
                            '<span>Clear Roadmap</span>' +
                            '<span>Faster Team Readiness</span>' +
                            '<span>Consistent Results</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="tpl1-overview-hero-icon" aria-label="Inner SPARC brand">' +
                        '<img src="/static/images/innersparc.png" alt="Inner SPARC logo" loading="lazy" />' +
                        '<p class="tpl1-overview-hero-note">Trusted onboarding foundation for every new team member.</p>' +
                    '</div>' +
                '</section>' +
                '<section class="tpl1-overview-challenge" aria-labelledby="betaChallengeTitle">' +
                    '<h3 id="betaChallengeTitle">Let me ask you something...</h3>' +
                    '<p class="tpl1-overview-challenge-lead">Losing deals because agents aren\'t ready fast enough?</p>' +
                    '<div class="tpl1-overview-challenge-list" aria-label="Common challenges">' +
                        '<div class="tpl1-overview-challenge-item">Spending hours manually onboarding each new agent?</div>' +
                        '<div class="tpl1-overview-challenge-item">Dealing with inconsistent training across your team?</div>' +
                        '<div class="tpl1-overview-challenge-item">Losing deals because agents aren\'t ready fast enough?</div>' +
                        '<div class="tpl1-overview-challenge-item">Drowning in paperwork and compliance documentation?</div>' +
                    '</div>' +
                    '<p class="tpl1-overview-challenge-footnote">If yes... <strong>you\'re not alone.</strong></p>' +
                    '<p class="tpl1-overview-challenge-subtitle">Manual onboarding is killing your growth potential.</p>' +
                '</section>' +
                '<section class="tpl1-overview-stats" aria-label="Overview metrics">' +
                    '<div class="tpl1-stat-card">' +
                        '<strong>500+</strong>' +
                        '<span>Agents Onboarded</span>' +
                    '</div>' +
                    '<div class="tpl1-stat-card">' +
                        '<strong>92%</strong>' +
                        '<span>Faster Time-to-Close</span>' +
                    '</div>' +
                    '<div class="tpl1-stat-card">' +
                        '<strong>\u20b18.2M</strong>' +
                        '<span>Revenue Generated</span>' +
                    '</div>' +
                '</section>' +
                '<section class="tpl1-overview-features" aria-labelledby="betaFeaturesTitle">' +
                    '<p class="tpl1-overview-features-subtitle">Three focused systems that help you reach success with confidence.</p>' +
                    '<h3 id="betaFeaturesTitle">What We Do</h3>' +
                    '<div class="tpl1-overview-feature-grid">' +
                        '<article class="tpl1-feature-card">' +
                            '<div class="tpl1-feature-icon">\u25f7</div>' +
                            '<p class="tpl1-feature-metric">83% time saved</p>' +
                            '<h4>10x Faster Onboarding</h4>' +
                            '<p>Transform weeks into days. Get your agents selling faster than ever before.</p>' +
                        '</article>' +
                        '<article class="tpl1-feature-card">' +
                            '<div class="tpl1-feature-icon">\u25ce</div>' +
                            '<p class="tpl1-feature-metric">100% consistency</p>' +
                            '<h4>Zero Training Gaps</h4>' +
                            '<p>Every agent gets the same world-class training. No shortcuts, no inconsistencies.</p>' +
                        '</article>' +
                        '<article class="tpl1-feature-card">' +
                            '<div class="tpl1-feature-icon">\u2197</div>' +
                            '<p class="tpl1-feature-metric">3x faster ROI</p>' +
                            '<h4>Instant Productivity</h4>' +
                            '<p>Agents start generating revenue from day one. No waiting, no ramp-up period.</p>' +
                        '</article>' +
                        '<article class="tpl1-feature-card">' +
                            '<div class="tpl1-feature-icon">\u25c9</div>' +
                            '<p class="tpl1-feature-metric">Zero violations</p>' +
                            '<h4>Built-in Compliance</h4>' +
                            '<p>Automated documentation and compliance checks. Sleep easy knowing everything is covered.</p>' +
                        '</article>' +
                    '</div>' +
                '</section>' +
                '<section class="tpl1-overview-journey" aria-labelledby="betaJourneyTitle">' +
                    '<div class="tpl1-journey-content">' +
                        '<p class="tpl1-journey-label">Proven system</p>' +
                        '<h3 id="betaJourneyTitle">From Application to <span>First Sale</span></h3>' +
                        '<ol>' +
                            '<li><span class="tpl1-journey-step-index">1</span><span>Automated application & background check</span></li>' +
                            '<li><span class="tpl1-journey-step-index">2</span><span>AI-powered training modules & assessments</span></li>' +
                            '<li><span class="tpl1-journey-step-index">3</span><span>Live mentor matching & shadowing</span></li>' +
                            '<li><span class="tpl1-journey-step-index">4</span><span>First deal support & celebration</span></li>' +
                        '</ol>' +
                    '</div>' +
                    '<div class="tpl1-journey-metrics">' +
                        '<article class="tpl1-journey-metric-card support-card">' +
                            '<div class="tpl1-metric-icon metric-support" aria-hidden="true">' +
                                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Support Access icon">' +
                                    '<path d="M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"></path>' +
                                    '<path d="M18 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"></path>' +
                                    '<path d="M3.8 19a6.2 6.2 0 0 1 12.4 0"></path>' +
                                    '<path d="M14.8 19a4.2 4.2 0 0 1 6-2.9"></path>' +
                                '</svg>' +
                            '</div>' +
                            '<strong>24/7</strong>' +
                            '<span>Support Access</span>' +
                        '</article>' +
                        '<article class="tpl1-journey-metric-card deal-card">' +
                            '<div class="tpl1-metric-icon metric-deal" aria-hidden="true">' +
                                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="To First Deal icon">' +
                                    '<path d="M13 2 5 14h6l-1 8 9-13h-6l0-7z"></path>' +
                                '</svg>' +
                            '</div>' +
                            '<strong>72hrs</strong>' +
                            '<span>To First Deal</span>' +
                        '</article>' +
                        '<article class="tpl1-journey-metric-card wide commission-card">' +
                            '<div class="tpl1-metric-icon metric-commission" aria-hidden="true">' +
                                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Avg. First Month Commission icon">' +
                                    '<path d="M4 19V5"></path>' +
                                    '<path d="M4 19h16"></path>' +
                                    '<path d="M8 15v-4"></path>' +
                                    '<path d="M12 15V9"></path>' +
                                    '<path d="M16 15V6"></path>' +
                                '</svg>' +
                            '</div>' +
                            '<strong>\u20b1215,000</strong>' +
                            '<span>Avg. First Month Commission</span>' +
                        '</article>' +
                    '</div>' +
                '</section>' +
                '<section class="tpl1-overview-cta" aria-label="CTA Section">' +
                    '<h3>Ready to Transform Your Onboarding?</h3>' +
                    '<p>Join hundreds of teams who\'ve automated their way to faster growth and happier agents.</p>' +
                    '<p class="tpl1-overview-cta-line">Let\'s Start Your Journey</p>' +
                '</section>' +
            '</div>';

        return '<div class="tpl1-grid">' +
            '<section class="tpl1-form-card tpl1-overview-wrap" aria-labelledby="betaAboutInnerSparcTitle">' +
                aboutCardHtml +
            '</section>' +
            tpl1Footer(
                '',
                '<button class="tpl1-btn" type="button" id="betaPrev" ' + (index === 0 ? 'disabled' : '') + '>Prev</button>',
                '<button class="tpl1-btn primary" type="button" id="betaOverviewNext">Continue</button>'
            ) +
        '</div>';
    }

    function getQuizState(step) {
        if (!step || !step.storageKey) {
            return {
                currentIndex: 0,
                selectedAnswers: [],
                completed: false,
                score: null,
                finalizing: false,
                attempts: 1,
                startedAtMs: Date.now(),
                durationSec: 0
            };
        }
        if (!quizStateByStorageKey[step.storageKey]) {
            quizStateByStorageKey[step.storageKey] = {
                currentIndex: 0,
                selectedAnswers: [],
                completed: false,
                score: null,
                finalizing: false,
                attempts: 1,
                startedAtMs: Date.now(),
                durationSec: 0
            };
        }
        return quizStateByStorageKey[step.storageKey];
    }

    function calculateQuizScore(questions, selectedAnswers) {
        if (!Array.isArray(questions) || !questions.length) return 0;
        var totalWithAnswerKey = questions.filter(function (question) {
            return typeof question.correctIndex === 'number';
        }).length;

        if (!totalWithAnswerKey) return 0;

        var correct = 0;
        for (var i = 0; i < questions.length; i += 1) {
            if (typeof questions[i].correctIndex === 'number' && selectedAnswers[i] === questions[i].correctIndex) {
                correct += 1;
            }
        }
        return Math.round((correct / totalWithAnswerKey) * 100);
    }

    function calculateQuizCorrectCount(questions, selectedAnswers) {
        if (!Array.isArray(questions) || !questions.length) return 0;
        var correct = 0;
        for (var i = 0; i < questions.length; i += 1) {
            if (typeof questions[i].correctIndex === 'number' && selectedAnswers[i] === questions[i].correctIndex) {
                correct += 1;
            }
        }
        return correct;
    }

    function getVideoQuizQuestionsForStep(step) {
        // Try to get contentId from step, fallback to default
        var contentId = (step && (step.contentId || step.storageKey || step.videoId)) || '';
        var source = getQuizQuestionsForVideo(contentId);
        if (!Array.isArray(source) || !source.length) return [];
        return source.slice(0, typeof VIDEO_QUIZ_QUESTIONS_PER_VIDEO === 'number' ? VIDEO_QUIZ_QUESTIONS_PER_VIDEO : source.length);
    }

    function getVideoQuizState(step) {
        var key = step && step.storageKey ? step.storageKey : '__video_quiz_default__';
        if (!videoQuizStateByStorageKey[key]) {
            videoQuizStateByStorageKey[key] = {
                started: false,
                passed: false,
                currentIndex: 0,
                selectedAnswers: [],
                attempts: 1,
                lastScore: null,
                durationSec: 0,
                startedAtMs: Date.now(),
                showResult: false,
                playbackFinished: false,
                updatedAt: Date.now()
            };
        } else {
            videoQuizStateByStorageKey[key] = sanitizeVideoQuizState(videoQuizStateByStorageKey[key]);
        }
        return videoQuizStateByStorageKey[key];
    }

    function setVideoQuizModalOpen(open, origin) {
        if (!videoQuizModal) return;
        var isOpen = Boolean(open);

        if (videoQuizModalOpenTimer) {
            window.clearTimeout(videoQuizModalOpenTimer);
            videoQuizModalOpenTimer = null;
        }

        if (videoQuizModalCloseTimer) {
            window.clearTimeout(videoQuizModalCloseTimer);
            videoQuizModalCloseTimer = null;
        }

        if (origin && typeof origin.x === 'number' && typeof origin.y === 'number') {
            videoQuizModal.style.setProperty('--video-modal-origin-x', Math.round(origin.x) + 'px');
            videoQuizModal.style.setProperty('--video-modal-origin-y', Math.round(origin.y) + 'px');
        }

        if (isOpen) {
            videoQuizModal.hidden = false;
            videoQuizModal.setAttribute('aria-hidden', 'false');
            videoQuizModal.classList.remove('is-closing');
            videoQuizModal.classList.remove('is-opening');
            videoQuizModal.classList.remove('is-open');
            window.requestAnimationFrame(function () {
                window.requestAnimationFrame(function () {
                    videoQuizModal.classList.add('is-opening');
                    videoQuizModal.classList.add('is-open');
                    videoQuizModalOpenTimer = window.setTimeout(function () {
                        if (videoQuizModal) {
                            videoQuizModal.classList.remove('is-opening');
                        }
                        videoQuizModalOpenTimer = null;
                    }, 460);
                });
            });
            return;
        }

        videoQuizModal.classList.add('is-closing');
        videoQuizModal.classList.remove('is-open');
        videoQuizModal.setAttribute('aria-hidden', 'true');
        videoQuizModalCloseTimer = window.setTimeout(function () {
            if (videoQuizModal && !videoQuizModal.classList.contains('is-open')) {
                videoQuizModal.hidden = true;
                videoQuizModal.classList.remove('is-closing');
                videoQuizModal.classList.remove('is-opening');
                videoQuizModal.style.removeProperty('--video-modal-origin-x');
                videoQuizModal.style.removeProperty('--video-modal-origin-y');
            }
            videoQuizModalCloseTimer = null;
        }, 420);
    }

    function setResumeQuizButtonVisibility(button, visible) {
        if (!button) return;
        var show = Boolean(visible);
        button.hidden = !show;
        button.style.display = show ? '' : 'none';
        button.setAttribute('aria-hidden', show ? 'false' : 'true');
    }

    function setResumeQuizButtonState(button, options) {
        if (!button) return;
        options = options || {};
        var visible = Boolean(options.visible);
        setResumeQuizButtonVisibility(button, visible);
        if (!visible) {
            button.disabled = false;
            button.setAttribute('aria-disabled', 'false');
            button.textContent = 'Resume Quiz';
            return;
        }
        button.textContent = options.label || 'Resume Quiz';
        var isDisabled = Boolean(options.disabled);
        button.disabled = isDisabled;
        button.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
    }

    function closeVideoQuizModal() {
        if (videoQuizModalClearTimer) {
            window.clearTimeout(videoQuizModalClearTimer);
            videoQuizModalClearTimer = null;
        }

        setVideoQuizModalOpen(false);
        videoQuizModalClearTimer = window.setTimeout(function () {
            if (videoQuizRoot) {
                videoQuizRoot.innerHTML = '';
            }
            videoQuizModalClearTimer = null;
        }, 420);
        activeVideoQuizStepIndex = null;
        activeVideoQuizOnPassed = null;
    }

    function resetVideoQuizAttempt(step, incrementAttempt) {
        if (!step) return;
        var quizState = getVideoQuizState(step);
        quizState.currentIndex = 0;
        quizState.selectedAnswers = [];
        quizState.showResult = false;
        quizState.lastScore = null;
        quizState.durationSec = 0;
        quizState.startedAtMs = Date.now();
        quizState.started = true;
        if (incrementAttempt) {
            quizState.attempts = Math.max(1, Number(quizState.attempts) || 1) + 1;
        }
        quizState.updatedAt = Date.now();
        persistVideoQuizState(step);
    }

    function bindVideoQuizModalInteractions() {
        if (videoQuizModalWired) return;
        videoQuizModalWired = true;

        if (videoQuizBackdrop) {
            videoQuizBackdrop.addEventListener('click', function () {
                closeVideoQuizModal();
            });
        }

        if (videoQuizCloseBtn) {
            videoQuizCloseBtn.addEventListener('click', function () {
                closeVideoQuizModal();
            });
        }

        if (!videoQuizRoot) return;
    }

    function renderVideoQuizModal() {
        if (!videoQuizRoot) return;

        var step = steps[activeVideoQuizStepIndex];
        if (!step) {
            videoQuizRoot.innerHTML = '';
            return;
        }

        var quizState = getVideoQuizState(step);
        var questions = getVideoQuizQuestionsForStep(step);
        var totalQuestions = questions.length;
        var question = questions[quizState.currentIndex] || { prompt: '', choices: [] };
        var correctCount = calculateQuizCorrectCount(questions, quizState.selectedAnswers);
        var selectedIndex = typeof quizState.selectedAnswers[quizState.currentIndex] === 'number'
            ? quizState.selectedAnswers[quizState.currentIndex]
            : null;
        var answeredCount = Array.isArray(quizState.selectedAnswers)
            ? quizState.selectedAnswers.filter(function (value) {
                return typeof value === 'number';
            }).length
            : 0;
        var completedCount = quizState.showResult
            ? totalQuestions
            : Math.max(0, Math.min(totalQuestions, answeredCount));
        var progressPercent = totalQuestions
            ? Math.round((completedCount / totalQuestions) * 100)
            : 0;

        var progressText = progressPercent + '% complete (' + completedCount + ' / ' + totalQuestions + ')';
        var resultMarkup = '';
        if (quizState.showResult) {
            var statusState = quizState.passed ? 'qr-pass' : ((quizState.lastScore || 0) >= 70 ? 'qr-near' : 'qr-fail');
            var statusTitle = quizState.passed
                ? 'Status: Passed'
                : (statusState === 'qr-near' ? 'Status: Near-pass' : 'Status: Failed');
            var statusMessage = quizState.passed
                ? 'Great job. You passed the quiz and can continue to the next training step.'
                : (statusState === 'qr-near'
                    ? 'You are close to passing. Review your answers and try again.'
                    : 'You did not meet the passing score. Please retake the quiz to continue.');
            var safeDuration = Number.isFinite(quizState.durationSec) && quizState.durationSec > 0
                ? Math.round(quizState.durationSec)
                : 0;
            var durationLabel = safeDuration > 0
                ? (Math.floor(safeDuration / 60) > 0
                    ? (Math.floor(safeDuration / 60) + 'm ' + String(safeDuration % 60).padStart(2, '0') + 's')
                    : (safeDuration + 's'))
                : '--';
            var attemptLabel = String(Math.max(1, Number(quizState.attempts) || 1));

            resultMarkup =
                '<section class="tpl1-form-card">' +
                    '<header class="tpl1-form-head"><h3>Quiz Result</h3><p>Review your score before proceeding.</p></header>' +
                    '<div class="tpl1-form-divider"></div>' +
                    '<div class="tpl1-review-wrap">' +
                        '<section class="quiz-result-card qr-state ' + statusState + '" aria-live="polite" aria-atomic="true">' +
                            '<div class="qr-top">' +
                                '<div class="qr-badge"><span class="qr-score">' + correctCount + '</span><small class="qr-percent">' + String(quizState.lastScore || 0) + '%</small></div>' +
                                '<div class="qr-status">' +
                                    '<h3 class="qr-title">' + statusTitle + '</h3>' +
                                    '<p class="qr-sub">' + statusMessage + '</p>' +
                                '</div>' +
                            '</div>' +
                            '<div class="qr-stats" role="status">' +
                                '<div class="qr-stat"><div class="label">Final Score</div><div class="value">' + correctCount + ' / ' + totalQuestions + '</div></div>' +
                                '<div class="qr-stat"><div class="label">Time</div><div class="value">' + durationLabel + '</div></div>' +
                                '<div class="qr-stat"><div class="label">Attempts</div><div class="value">' + attemptLabel + '</div></div>' +
                            '</div>' +
                        '</section>' +
                    '</div>' +
                '</section>';
        }

        var choicesMarkup = !quizState.showResult
            ? (question.choices || []).map(function (choice, choiceIndex) {
                var selectedClass = selectedIndex === choiceIndex ? ' is-selected' : '';
                var letter = String.fromCharCode(65 + choiceIndex);
                return '<button type="button" class="tpl1-video-quiz-choice' + selectedClass + '" data-video-quiz-action="choice" data-choice-index="' + choiceIndex + '" role="radio" aria-checked="' + (selectedIndex === choiceIndex ? 'true' : 'false') + '">' +
                    '<span class="tpl1-video-quiz-radio" aria-hidden="true"><span class="tpl1-video-quiz-radio-dot"></span></span>' +
                    '<span class="tpl1-video-quiz-letter">' + letter + '</span>' +
                    '<span class="tpl1-video-quiz-text">' + escapeHtmlAttr(choice) + '</span>' +
                '</button>';
            }).join('')
            : '';

        var stepCountLabel = quizState.showResult
            ? 'Continue to proceed to the next training step.'
            : ('Question ' + (quizState.currentIndex + 1) + ' of ' + totalQuestions);

        var nextLabel = quizState.currentIndex >= totalQuestions - 1 ? 'Submit' : 'Next';
        var disablePrev = quizState.showResult || quizState.currentIndex === 0;
        var disableNext = quizState.showResult || selectedIndex === null;

        videoQuizRoot.innerHTML =
            '<section class="tpl1-video-quiz-progress" aria-label="Quiz progress">' +
                '<div class="tpl1-video-quiz-progress-head">' +
                    '<span class="tpl1-video-quiz-progress-label">Quiz Progress</span>' +
                    '<span>' + progressText + '</span>' +
                '</div>' +
                '<div class="tpl1-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + progressPercent + '">' +
                    '<div class="tpl1-fill" style="width:' + progressPercent + '%"></div>' +
                '</div>' +
            '</section>' +
            (!quizState.showResult
                ? '<h4 class="tpl1-video-quiz-question">' + escapeHtmlAttr(question.prompt || '') + '</h4>' +
                  '<div class="tpl1-video-quiz-choices" role="radiogroup" aria-label="Video quiz options">' + choicesMarkup + '</div>'
                : resultMarkup) +
            '<footer class="tpl1-foot">' +
                '<span class="tpl1-note tpl1-video-quiz-step-count">' + stepCountLabel + '</span>' +
                '<div class="tpl1-controls">' +
                                        (!quizState.showResult
                                                ? '<button class="tpl1-btn" type="button" data-video-quiz-action="prev" ' + (disablePrev ? 'disabled' : '') + '>Previous</button>' +
                                                    '<button class="tpl1-btn primary" type="button" data-video-quiz-action="next" ' + (disableNext ? 'disabled' : '') + '>' + nextLabel + '</button>'
                                                : '<button class="tpl1-btn" type="button" data-video-quiz-action="retake">Retake Quiz</button>' +
                                                    '<button class="tpl1-btn primary" type="button" data-video-quiz-action="continue" ' + (quizState.passed ? '' : 'disabled') + '>Continue</button>') +
                '</div>' +
            '</footer>';
    }

    function openVideoQuizModal(index, onPassed) {
        var step = steps[index];
        if (!step || step.type !== 'video') return;

        var quizState = getVideoQuizState(step);
        quizState.started = true;
        if (!Number(quizState.startedAtMs)) {
            quizState.startedAtMs = Date.now();
        }
        quizState.updatedAt = Date.now();
        persistVideoQuizState(step);

        activeVideoQuizStepIndex = index;
        activeVideoQuizOnPassed = typeof onPassed === 'function' ? onPassed : null;

        setVideoQuizModalOpen(true);
        renderVideoQuizModal();
    }

    function postQuizScore(stepKey, score, moduleId) {
        var payload = {
            step_key: stepKey,
            score: score
        };
        if (moduleId) {
            payload.module_id = moduleId;
        }
        return fetch('/portal-onboarding/step-complete/', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(payload)
        }).catch(function () {
            return null;
        });
    }

    function quizContainerMarkup() {
        return '<div id="tplQuizRoot" class="onboarding-quiz-root"></div>';
    }

    function quizResultMarkup(index) {
        var quizStep = steps[index];
        var quizState = getQuizState(quizStep);
        var totalQuestions = agentReadinessQuestions.length;
        var selectedAnswers = Array.isArray(quizState.selectedAnswers) ? quizState.selectedAnswers : [];
        var percent = typeof quizState.score === 'number'
            ? quizState.score
            : calculateQuizScore(agentReadinessQuestions, selectedAnswers);
        var hasResult = totalQuestions > 0 && selectedAnswers.length > 0;
        var correctCount = calculateQuizCorrectCount(agentReadinessQuestions, selectedAnswers);
        var passed = hasResult && percent >= 80;
        var statusLabel = passed ? 'Passed' : 'Failed';
        var message = passed
            ? 'Congrats! You passed and are now one step closer to activation.'
            : 'You did not meet the passing score. Please retake the quiz to continue.';
        var scoreLine = hasResult
            ? (correctCount + ' / ' + totalQuestions + ' (' + percent + '%)')
            : 'No quiz result available yet.';

        return '<div class="tpl1-grid">' +
            '<section class="tpl1-form-card">' +
                '<header class="tpl1-form-head"><h3>Quiz Result</h3><p>Review your score before proceeding.</p></header>' +
                '<div class="tpl1-form-divider"></div>' +
                                '<div class="tpl1-review-wrap">' +
                                        '<section class="quiz-result-card qr-state" id="quizResult" aria-live="polite">' +
                                            '<div class="qr-top">' +
                                                '<div class="qr-badge"><span class="qr-score">0</span><small class="qr-percent">0%</small></div>' +
                                                '<div class="qr-status">' +
                                                    '<h3 class="qr-title">Status: Failed</h3>' +
                                                    '<p class="qr-sub">You did not meet the passing score. Please retake the quiz to continue.</p>' +
                                                '</div>' +
                                            '</div>' +

                                            '<div class="qr-stats" role="status">' +
                                                '<div class="qr-stat"><div class="label">Final Score</div><div class="value">0 / 15</div></div>' +
                                                '<div class="qr-stat"><div class="label">Time</div><div class="value">--</div></div>' +
                                                '<div class="qr-stat"><div class="label">Attempts</div><div class="value">1</div></div>' +
                                            '</div>' +
                                        '</section>' +
                                '</div>' +
            '</section>' +
            tpl1Footer(
                'Continue to proceed to the next module.',
                '<button class="tpl1-btn" type="button" id="betaPrev" ' + (index === 0 ? 'disabled' : '') + '>Prev</button><button class="tpl1-btn" type="button" id="betaQuizRetake">Retake Quiz</button>',
                '<button class="tpl1-btn primary" type="button" id="betaResultContinue" ' + (hasResult ? '' : 'disabled') + '>Continue</button>'
            ) +
        '</div>';
    }

    function loadQuizFallbackTemplate() {
        if (quizFallbackTemplateCache) {
            return Promise.resolve(quizFallbackTemplateCache);
        }

        return fetch('/static/html/onboarding-quiz-fallback.html', {
            method: 'GET',
            credentials: 'same-origin'
        }).then(function (response) {
            if (!response.ok) {
                throw new Error('Fallback template unavailable');
            }
            return response.text();
        }).then(function (html) {
            quizFallbackTemplateCache = html || '<section class="oqp-panel" data-quiz-fallback="root"></section>';
            return quizFallbackTemplateCache;
        }).catch(function () {
            quizFallbackTemplateCache = '<section class="oqp-panel" data-quiz-fallback="root"></section>';
            return quizFallbackTemplateCache;
        });
    }

    function mountQuizFallback(host, step, quizState, onComplete) {
        loadQuizFallbackTemplate().then(function (templateHtml) {
            host.innerHTML = templateHtml;

            var rootEl = host.querySelector('[data-quiz-fallback="root"]') || host;
            var slideEl = rootEl.querySelector('[data-quiz-fallback="slide"]');
            var progressFillEl = rootEl.querySelector('[data-quiz-fallback="progress"]');
            var indexEl = rootEl.querySelector('[data-quiz-fallback="index"]') || rootEl.querySelector('.tpl1-note');
            var promptEl = rootEl.querySelector('[data-quiz-fallback="prompt"]');
            var choicesEl = rootEl.querySelector('[data-quiz-fallback="choices"]');
            var resultEl = rootEl.querySelector('[data-quiz-fallback="result"]');
            var prevBtn = rootEl.querySelector('[data-quiz-fallback="prev"]') || rootEl.querySelector('#quizPrev');
            var nextBtn = rootEl.querySelector('[data-quiz-fallback="next"]') || rootEl.querySelector('#quizNext');

            if (!slideEl || !indexEl || !promptEl || !choicesEl || !prevBtn || !nextBtn) {
                return;
            }

            var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            var QUESTION_EXIT_MS = prefersReducedMotion ? 0 : 130;
            var QUESTION_ENTER_MS = prefersReducedMotion ? 0 : 170;
            var OPTION_STAGGER_MS = prefersReducedMotion ? 0 : 40;
            var SELECTION_PULSE_MS = prefersReducedMotion ? 0 : 220;
            var transitionEpoch = 0;
            var timerQueue = [];

            quizState.transitioning = false;

            function queueTimer(callback, delay) {
                var timerId = window.setTimeout(callback, delay);
                timerQueue.push(timerId);
                return timerId;
            }

            function clearTimerQueue() {
                while (timerQueue.length) {
                    window.clearTimeout(timerQueue.pop());
                }
            }

            function startTransitionEpoch() {
                transitionEpoch += 1;
                clearTimerQueue();
                return transitionEpoch;
            }

            function isEpochActive(epoch) {
                return epoch === transitionEpoch && rootEl && rootEl.isConnected;
            }

            function setButtonDisabled(button, disabled) {
                if (!button) return;
                button.disabled = Boolean(disabled);
                button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
            }

            function setTransitionLock(isLocked) {
                quizState.transitioning = Boolean(isLocked);
                rootEl.classList.toggle('oqp-transitioning', Boolean(isLocked));
                rootEl.setAttribute('aria-busy', isLocked ? 'true' : 'false');
                if (isLocked) {
                    setButtonDisabled(prevBtn, true);
                    setButtonDisabled(nextBtn, true);
                }
            }

            function clearSlideMotionClasses() {
                slideEl.classList.remove(
                    'oqp-phase-exit',
                    'oqp-phase-enter',
                    'oqp-dir-next',
                    'oqp-dir-prev',
                    'is-animating'
                );
            }

            function applyOptionReveal() {
                if (promptEl) {
                    promptEl.classList.remove('oqp-question--enter');
                    void promptEl.offsetWidth;
                    promptEl.classList.add('oqp-question--enter');
                }

                var optionButtons = Array.prototype.slice.call(choicesEl.querySelectorAll('[data-quiz-choice]'));
                optionButtons.forEach(function (choiceButton, index) {
                    choiceButton.style.setProperty('--oqp-stagger-delay', String(index * OPTION_STAGGER_MS) + 'ms');
                    choiceButton.classList.remove('oqp-choice--enter');
                    void choiceButton.offsetWidth;
                    choiceButton.classList.add('oqp-choice--enter');
                });
            }

            function applySelectionPulse(choiceIndex) {
                if (prefersReducedMotion || typeof choiceIndex !== 'number') return;
                var selectedButton = choicesEl.querySelector('[data-quiz-choice="' + choiceIndex + '"]');
                if (!selectedButton) return;
                selectedButton.classList.remove('is-confirm');
                window.requestAnimationFrame(function () {
                    selectedButton.classList.add('is-confirm');
                    queueTimer(function () {
                        selectedButton.classList.remove('is-confirm');
                    }, SELECTION_PULSE_MS);
                });
            }

            function focusCurrentChoiceOrFirst() {
                if (prefersReducedMotion) return;
                var selectedChoice = choicesEl.querySelector('[aria-checked="true"]');
                var firstChoice = choicesEl.querySelector('[data-quiz-choice]');
                var target = selectedChoice || firstChoice || promptEl;
                if (!target) return;

                if (target === promptEl) {
                    promptEl.setAttribute('tabindex', '-1');
                }

                if (typeof target.focus === 'function') {
                    target.focus({ preventScroll: true });
                }
            }

            function updateFooterButtons(selected) {
                if (quizState.completed) {
                    setButtonDisabled(prevBtn, true);
                    setButtonDisabled(nextBtn, true);
                    return;
                }

                var disablePrev = quizState.currentIndex === 0;
                var disableNext = selected === null;

                if (quizState.transitioning) {
                    disablePrev = true;
                    disableNext = true;
                }

                setButtonDisabled(prevBtn, disablePrev);
                setButtonDisabled(nextBtn, disableNext);
                nextBtn.textContent = 'Next';
            }

            function runQuestionTransition(direction, onSwapContent, onComplete) {
                if (quizState.transitioning) return;

                if (prefersReducedMotion) {
                    onSwapContent();
                    onComplete();
                    return;
                }

                var epoch = startTransitionEpoch();

                var directionClass = direction === 'prev' ? 'oqp-dir-prev' : 'oqp-dir-next';
                var previousHeight = slideEl.offsetHeight;
                slideEl.style.minHeight = previousHeight + 'px';

                setTransitionLock(true);
                clearSlideMotionClasses();
                slideEl.classList.add('oqp-phase-exit', directionClass);
                window.requestAnimationFrame(function () {
                    if (!isEpochActive(epoch)) return;
                    slideEl.classList.add('is-animating');
                });

                queueTimer(function () {
                    if (!isEpochActive(epoch)) return;
                    onSwapContent();

                    var nextHeight = slideEl.offsetHeight;
                    slideEl.style.minHeight = Math.max(previousHeight, nextHeight) + 'px';

                    clearSlideMotionClasses();
                    slideEl.classList.add('oqp-phase-enter', directionClass);
                    window.requestAnimationFrame(function () {
                        if (!isEpochActive(epoch)) return;
                        slideEl.classList.add('is-animating');
                    });

                    queueTimer(function () {
                        if (!isEpochActive(epoch)) return;
                        clearSlideMotionClasses();
                        slideEl.style.minHeight = '';
                        setTransitionLock(false);
                        onComplete();
                    }, QUESTION_ENTER_MS);
                }, QUESTION_EXIT_MS);
            }

            function selectChoice(choiceIndex) {
                if (quizState.transitioning || quizState.completed) return;
                quizState.selectedAnswers[quizState.currentIndex] = choiceIndex;
                renderQuiz({
                    skipChoiceReveal: true,
                    selectionPulseIndex: choiceIndex
                });
            }

            function completeQuizFlow() {
                if (quizState.finalizing) return;
                quizState.finalizing = true;
                quizState.completed = true;
                quizState.score = calculateQuizScore(agentReadinessQuestions, quizState.selectedAnswers);
                quizState.durationSec = Math.max(0, Math.round((Date.now() - (Number(quizState.startedAtMs) || Date.now())) / 1000));
                renderQuiz();

                postQuizScore(step.storageKey, quizState.score, step.moduleId).then(function (result) {
                    if (!result || !result.ok) {
                        quizState.finalizing = false;
                        return;
                    }
                    window.setTimeout(function () {
                        onComplete({
                            score: quizState.score,
                            answers: quizState.selectedAnswers.slice()
                        });
                    }, 320);
                });
            }

            function renderQuiz(options) {
                options = options || {};
                var questionCount = agentReadinessQuestions.length;
                var selected = typeof quizState.selectedAnswers[quizState.currentIndex] === 'number'
                    ? quizState.selectedAnswers[quizState.currentIndex]
                    : null;

                var progress = quizState.completed
                    ? 100
                    : (questionCount ? Math.round(((quizState.currentIndex + 1) / questionCount) * 100) : 0);
                if (progressFillEl) {
                    progressFillEl.style.width = progress + '%';
                }

                if (quizState.completed) {
                    var passed = quizState.score >= 80;
                    promptEl.hidden = true;
                    choicesEl.hidden = true;
                    resultEl.hidden = false;
                    resultEl.textContent = passed ? 'You are ready to proceed.' : 'You need at least 80% to pass.';
                    indexEl.textContent = '';
                    updateFooterButtons(selected);
                    return;
                }

                var question = agentReadinessQuestions[quizState.currentIndex] || { prompt: '', choices: [] };
                promptEl.hidden = false;
                choicesEl.hidden = false;
                resultEl.hidden = true;

                indexEl.textContent = 'Question ' + (quizState.currentIndex + 1) + ' of ' + questionCount;
                promptEl.textContent = question.prompt || '';

                choicesEl.innerHTML = (question.choices || []).map(function (choice, choiceIndex) {
                    var selectedClass = selected === choiceIndex ? ' is-selected' : '';
                    var optionLetter = String.fromCharCode(65 + choiceIndex);
                    var staggerClass = ' oqp-stagger-' + (choiceIndex % 6);
                    return '<button class="oqp-choice transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none bg-transparent' + staggerClass + selectedClass + '" type="button" data-quiz-choice="' + choiceIndex + '" role="radio" aria-checked="' + (selected === choiceIndex ? 'true' : 'false') + '">' +
                        '<span class="oqp-choice-circle" aria-hidden="true"><span class="oqp-choice-dot"></span></span>' +
                        '<span class="oqp-choice-letter">' + optionLetter + '</span>' +
                        '<span class="oqp-choice-text">' + escapeHtmlAttr(choice) + '</span>' +
                    '</button>';
                }).join('');

                Array.prototype.slice.call(choicesEl.querySelectorAll('[data-quiz-choice]')).forEach(function (choiceButton) {
                    choiceButton.addEventListener('click', function () {
                        selectChoice(Number(choiceButton.getAttribute('data-quiz-choice')));
                    });
                    choiceButton.addEventListener('keydown', function (event) {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            choiceButton.click();
                        }
                    });
                });

                updateFooterButtons(selected);
                if (!options.skipChoiceReveal) {
                    applyOptionReveal();
                }
                applySelectionPulse(options.selectionPulseIndex);
            }

            prevBtn.addEventListener('click', function () {
                if (quizState.currentIndex === 0 || quizState.completed || quizState.transitioning) return;

                runQuestionTransition('prev', function () {
                    quizState.currentIndex -= 1;
                    renderQuiz();
                }, function () {
                    focusCurrentChoiceOrFirst();
                    updateFooterButtons(typeof quizState.selectedAnswers[quizState.currentIndex] === 'number'
                        ? quizState.selectedAnswers[quizState.currentIndex]
                        : null);
                });
            });

            nextBtn.addEventListener('click', function () {
                if (quizState.completed || quizState.transitioning) return;
                if (typeof quizState.selectedAnswers[quizState.currentIndex] !== 'number') return;
                if (quizState.currentIndex < agentReadinessQuestions.length - 1) {
                    runQuestionTransition('next', function () {
                        quizState.currentIndex += 1;
                        renderQuiz();
                    }, function () {
                        focusCurrentChoiceOrFirst();
                        updateFooterButtons(typeof quizState.selectedAnswers[quizState.currentIndex] === 'number'
                            ? quizState.selectedAnswers[quizState.currentIndex]
                            : null);
                    });
                    return;
                }
                completeQuizFlow();
            });

            renderQuiz();
        });
    }

    function mountQuizStep(index) {
        var step = steps[index];
        var quizHost = document.getElementById('tplQuizRoot');
        if (!step || !quizHost) return;

        var quizState = getQuizState(step);
        var onComplete = function (result) {
            var score = result && typeof result.score === 'number' ? result.score : 0;
            if (Array.isArray(result && result.answers)) {
                quizState.selectedAnswers = result.answers.slice();
            }
            quizState.completed = true;
            quizState.score = score;
            renderAll({ animatePanel: true });
        };

        if (window.React && window.ReactDOM && window.OnboardingQuizPanel) {
            try {
                var component = window.React.createElement(window.OnboardingQuizPanel, {
                    stepKey: step.storageKey,
                    questions: agentReadinessQuestions,
                    initialIndex: quizState.currentIndex,
                    initialAnswers: quizState.selectedAnswers,
                    onComplete: onComplete
                });

                if (typeof window.ReactDOM.createRoot === 'function') {
                    if (!quizHost._onboardingQuizRoot) {
                        quizHost._onboardingQuizRoot = window.ReactDOM.createRoot(quizHost);
                    }
                    quizHost._onboardingQuizRoot.render(component);
                } else if (typeof window.ReactDOM.render === 'function') {
                    window.ReactDOM.render(component, quizHost);
                } else {
                    mountQuizFallback(quizHost, step, quizState, onComplete);
                }
                return;
            } catch (reactError) {
                console.warn('Quiz React mount failed, falling back to vanilla renderer.', reactError);
            }
        }

        mountQuizFallback(quizHost, step, quizState, onComplete);
    }

    function formMarkup(step, index) {
        var body = '';
        if (step.title === 'Profile & Identity') {
            body = '<input class="tpl1-field" id="betaFirstName" type="text" placeholder="First Name" value="' + escapeHtmlAttr(onboardingPrefill.firstName) + '">' +
                '<input class="tpl1-field" id="betaLastName" type="text" placeholder="Last Name" value="' + escapeHtmlAttr(onboardingPrefill.lastName) + '">' +
                '<input class="tpl1-field" id="betaPrimaryEmail" type="email" placeholder="Primary Email" value="' + escapeHtmlAttr(onboardingPrefill.email) + '">' +
            '<div class="tpl1-phone-unified tpl1-field-group" id="betaPhoneUnified" data-default-dial="+63" role="group" aria-label="Mobile number">' +
                '<button id="betaPhoneCountryBtn" type="button" class="tpl1-phone-country" aria-haspopup="listbox" aria-expanded="false" aria-controls="betaPhoneCountryList">' +
                    '<span class="tpl1-flag">🇵🇭</span>' +
                    '<span class="tpl1-code">+63</span>' +
                    '<span class="tpl1-chevron" aria-hidden="true">▾</span>' +
                '</button>' +
                '<div class="tpl1-phone-divider" aria-hidden="true"></div>' +
                '<div class="tpl1-phone-input-wrap">' +
                    '<input class="tpl1-field tpl1-phone-input" id="betaPrimaryPhone" type="tel" inputmode="tel" placeholder="9XXXXXXXXX" value="' + escapeHtmlAttr(onboardingPrefill.phoneNumber || '') + '" aria-label="Mobile number">' +
                '</div>' +
                '<div id="betaPhoneCountryList" class="tpl1-phone-country-list" role="listbox" aria-hidden="true" tabindex="-1">' +
                    '<button type="button" role="option" class="country-option" data-code="+63" data-iso="PH" aria-selected="true"><span class="flag">🇵🇭</span><span class="name">Philippines</span><span class="dial">+63</span></button>' +
                    '<button type="button" role="option" class="country-option" data-code="+1" data-iso="US" aria-selected="false"><span class="flag">🇺🇸</span><span class="name">United States</span><span class="dial">+1</span></button>' +
                    '<button type="button" role="option" class="country-option" data-code="+44" data-iso="GB" aria-selected="false"><span class="flag">🇬🇧</span><span class="name">United Kingdom</span><span class="dial">+44</span></button>' +
                '</div>' +
            '</div>' +
            '<div class="tpl1-field-row-two profile-2col tpl1-field-full">' +
                '<div class="birthdate-input-wrap" id="betaBirthdateControl" role="group" aria-label="Birthdate">' +
                    '<input class="tpl1-field" id="betaBirthdate" name="birthdate" type="text" placeholder="Birth Date" value="' + escapeHtmlAttr(onboardingPrefill.birthdate || '') + '" aria-label="Birthdate" aria-haspopup="dialog" aria-expanded="false" aria-controls="betaBirthdatePanel">' +
                    '<button type="button" class="birthdate-trigger" id="betaBirthdateTrigger" aria-label="Open birthdate picker" aria-controls="betaBirthdatePanel">' +
                        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                            '<rect x="3" y="4" width="18" height="17" rx="3"></rect>' +
                            '<path d="M8 2.8v3.4M16 2.8v3.4M3 9.5h18"></path>' +
                        '</svg>' +
                    '</button>' +
                '</div>' +
                '<div class="tpl1-phone-unified" id="betaGenderControl" role="group" aria-label="Gender">' +
                    '<button id="betaGenderTrigger" type="button" class="tpl1-phone-country" aria-haspopup="listbox" aria-expanded="false" aria-controls="betaGenderList">' +
                        '<span class="tpl1-code" id="betaGenderValue">Select gender</span>' +
                        '<span class="tpl1-chevron" aria-hidden="true">▾</span>' +
                    '</button>' +
                    '<select class="tpl1-field tpl1-native-hidden" id="betaGender" name="gender" aria-label="Gender">' +
                        '<option value="">Select gender</option>' +
                        '<option value="male"' + (onboardingPrefill.gender === 'male' ? ' selected' : '') + '>Male</option>' +
                        '<option value="female"' + (onboardingPrefill.gender === 'female' ? ' selected' : '') + '>Female</option>' +
                        '<option value="prefer_not_to_say"' + (onboardingPrefill.gender === 'prefer_not_to_say' ? ' selected' : '') + '>Prefer not to say</option>' +
                    '</select>' +
                    '<div id="betaGenderList" class="tpl1-phone-country-list" role="listbox" aria-hidden="true" tabindex="-1">' +
                        '<button type="button" role="option" class="gender-option" data-value="male" aria-selected="' + (onboardingPrefill.gender === 'male' ? 'true' : 'false') + '"><span class="name">Male</span></button>' +
                        '<button type="button" role="option" class="gender-option" data-value="female" aria-selected="' + (onboardingPrefill.gender === 'female' ? 'true' : 'false') + '"><span class="name">Female</span></button>' +
                        '<button type="button" role="option" class="gender-option" data-value="prefer_not_to_say" aria-selected="' + (onboardingPrefill.gender === 'prefer_not_to_say' ? 'true' : 'false') + '"><span class="name">Prefer not to say</span></button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div id="betaBirthdatePanel" class="tpl1-datepicker-panel" role="dialog" aria-modal="false" aria-label="Select birthdate" aria-hidden="true">' +
                '<div class="birthdate-panel-head">' +
                    '<button type="button" class="birthdate-nav" id="betaBirthdatePrev" aria-label="Previous month">&#8249;</button>' +
                    '<div class="birthdate-jump">' +
                        '<button type="button" id="betaBirthdateMonthTrigger" class="birthdate-select-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="betaBirthdateMonthList">' +
                            '<span id="betaBirthdateMonthValue">Month</span> <span aria-hidden="true">▾</span>' +
                        '</button>' +
                        '<button type="button" id="betaBirthdateYearTrigger" class="birthdate-select-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="betaBirthdateYearList">' +
                            '<span id="betaBirthdateYearValue">Year</span> <span aria-hidden="true">▾</span>' +
                        '</button>' +
                        '<select class="birthdate-select tpl1-native-hidden" id="betaBirthdateMonth" aria-label="Birth month"></select>' +
                        '<select class="birthdate-select tpl1-native-hidden" id="betaBirthdateYear" aria-label="Birth year"></select>' +
                        '<div id="betaBirthdateMonthList" class="birthdate-simple-list" role="listbox" aria-hidden="true" tabindex="-1"></div>' +
                        '<div id="betaBirthdateYearList" class="birthdate-simple-list" role="listbox" aria-hidden="true" tabindex="-1"></div>' +
                    '</div>' +
                    '<button type="button" class="birthdate-nav" id="betaBirthdateNext" aria-label="Next month">&#8250;</button>' +
                '</div>' +
                '<div class="birthdate-weekdays" aria-hidden="true">' +
                    '<span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>' +
                '</div>' +
                '<div class="birthdate-grid" id="betaBirthdateGrid" role="grid" aria-label="Birthdate calendar"></div>' +
            '</div>' +
            '<input class="tpl1-field tpl1-field-full" id="betaResidentialAddress" type="text" placeholder="Current Residential Address" value="' + escapeHtmlAttr(onboardingProfileData.residential_address) + '">' +
            '<div class="tpl1-field-msg" id="betaProfileIdentityStatus" aria-live="polite"></div>' +
            '<div class="tpl1-field-msg" id="betaProfileIdentityError" aria-live="polite"></div>';
        } else {
            body = '<input class="tpl1-field tpl1-field-full" type="text" placeholder="Current Residential Address">' +
            '<div class="tpl1-upload tpl1-field-full"><div class="tpl1-upload-copy"><strong>Required Document</strong><span>Upload required file.</span></div><button class="tpl1-upload-btn" type="button">Upload File</button></div>';
        }

        return '<div class="tpl1-grid">' +
            '<section class="tpl1-form-card">' +
                '<header class="tpl1-form-head"><h3>' + step.title + '</h3><p>Complete this form to continue onboarding.</p></header>' +
                '<div class="tpl1-form-divider"></div>' +
                '<div class="tpl1-card-grid">' + body + '</div>' +
            '</section>' +
            tpl1Footer(
                'Complete this form to continue onboarding.',
                '<button class="tpl1-btn" type="button" id="betaPrev" ' + (index === 0 ? 'disabled' : '') + '>Prev</button>',
                '<button class="tpl1-btn primary" type="button" id="betaMarkDone">Mark Complete</button>'
            ) +
        '</div>';
    }

    function uploadMarkup(step, index) {
        function uploadItem(id, fieldName, title, description, docId, acceptTypes) {
            var fileMeta = onboardingProfileData.agent_requirement_documents[fieldName] || null;
            var uploadedName = fileMetaName(fileMeta);
            var initialLabel = uploadedName ? ('Uploaded: ' + uploadedName) : description;
            var initialAction = uploadedName || 'Choose File';
            var hasFileClass = uploadedName ? ' has-file' : '';
            var rowIdAttr = docId ? (' id="row-' + escapeHtmlAttr(docId) + '"') : '';
            var rowClass = docId ? ' doc-row' : '';
            var inputDocAttrs = docId ? (' data-doc-id="' + escapeHtmlAttr(docId) + '"') : '';
            var inputClass = docId ? 'tpl1-upload-input doc-file-input' : 'tpl1-upload-input';
            var acceptAttr = acceptTypes || '.pdf,.jpg,.jpeg,.png';
            var feedbackMarkup = docId
                ? ('<span class="doc-feedback" id="feedback-' + escapeHtmlAttr(docId) + '" aria-live="polite"></span>')
                : '';
            var loaderMarkup = docId
                ? ('<div class="validation-loader" id="loader-' + escapeHtmlAttr(docId) + '" hidden></div>')
                : '';

            var rowMarkup = '<div class="tpl1-upload tpl1-field-full' + rowClass + '"' + rowIdAttr + '>' +
                '<div class="tpl1-upload-copy">' +
                    '<strong>' + title + '</strong>' +
                    '<span id="' + id + '-label" data-default-label="' + escapeHtmlAttr(description) + '">' + initialLabel + '</span>' +
                '</div>' +
                '<input class="' + inputClass + '" type="file" id="' + id + '" accept="' + escapeHtmlAttr(acceptAttr) + '"' + inputDocAttrs + ' />' +
                '<label class="tpl1-upload-action choose-btn' + hasFileClass + '" for="' + id + '" data-upload-trigger="' + id + '" tabindex="0">' +
                    '<span class="tpl1-upload-icon-wrap" aria-hidden="true">' +
                        '<svg class="tpl1-upload-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V6"></path><path d="m8.5 9.5 3.5-3.5 3.5 3.5"></path><path d="M5 18h14"></path></svg>' +
                        '<svg class="tpl1-upload-check" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4 4L19 7"></path></svg>' +
                    '</span>' +
                    '<span class="tpl1-upload-action-text" id="' + id + '-action-text">' + initialAction + '</span>' +
                '</label>' +
                loaderMarkup +
            '</div>';

            if (!docId) {
                return rowMarkup;
            }

            return '<div class="doc-upload-block" id="block-' + escapeHtmlAttr(docId) + '">' +
                rowMarkup +
                feedbackMarkup +
            '</div>';
        }

        var sectionDescription = 'Upload required documents for this section.';
        var fields = '';

        if (step.title === 'Agent Requirements Documents') {
            sectionDescription = 'All required onboarding papers for newly hired real estate agents.';
            fields =
                uploadItem(
                    'betaValidGovernmentId1',
                    'valid_government_id_1',
                    'Valid Government ID (Primary)',
                    'Upload your primary government-issued ID (front or full-page scan). Accepted file types: PDF, JPG, JPEG, PNG.',
                    'govid1'
                ) +
                uploadItem(
                    'betaValidGovernmentId2',
                    'valid_government_id_2',
                    'Valid Government ID (Secondary)',
                    'Upload a secondary government-issued ID for additional verification. Accepted file types: PDF, JPG, JPEG, PNG.',
                    'govid2'
                ) +
                uploadItem(
                    'betaDocTin',
                    'tin_verification',
                    'TIN Verification',
                    'Upload BIR Form 2303 or a screenshot/document showing your Tax Identification Number (TIN). Real estate sales are commission-based and require tax registration.',
                    'tin'
                ) +
                uploadItem(
                    'betaPhoto2x2',
                    'photo_2x2',
                    '2x2 Picture',
                    'Upload a recent 2x2 ID photo. Accepted file types: JPG, JPEG, PNG.',
                    'photo2x2',
                    '.jpg,.jpeg,.png'
                ) +
                uploadItem(
                    'betaPhoto1x1',
                    'photo_1x1',
                    '1x1 Picture',
                    'Upload a recent 1x1 ID photo. Accepted file types: JPG, JPEG, PNG.',
                    'photo1x1',
                    '.jpg,.jpeg,.png'
                );
        } else {
            fields = uploadItem('betaDocGeneric', 'tin_verification', 'Required Document', 'Choose a file to continue.');
        }

        return '<div class="tpl1-grid">' +
            '<section class="tpl1-form-card">' +
                '<header class="tpl1-form-head"><h3>' + step.title + '</h3><p>' + sectionDescription + '</p></header>' +
                '<div class="tpl1-form-divider"></div>' +
                '<div class="tpl1-card-grid tpl1-docs-list">' +
                    fields +
                '</div>' +
                '<div class="tpl1-field-msg" id="betaAgentDocsStatus" aria-live="polite"></div>' +
            '</section>' +
            tpl1Footer(
                'All required documents in this section must be uploaded before marking complete.',
                '<button class="tpl1-btn" type="button" id="betaPrev" ' + (index === 0 ? 'disabled' : '') + '>Prev</button>',
                '<button class="tpl1-btn primary" type="button" id="betaMarkDone" disabled>Mark Complete</button>'
            ) +
        '</div>';
    }

    function reviewMarkup(index) {
        var doneCount = completed.size;
        var attachedDocsList = reviewDocumentsListMarkup();

        return '<div class="tpl1-grid">' +
            '<section class="tpl1-form-card">' +
                '<header class="tpl1-form-head"><h3>Review & Activation</h3><p>Review your completed onboarding records and submit for activation.</p></header>' +
                '<div class="tpl1-form-divider"></div>' +
                '<div class="tpl1-review-wrap">' +
                    '<div class="tpl1-review-summary">' + doneCount + ' of ' + steps.length + ' steps completed.</div>' +
                    '<p class="tpl1-review-summary" style="line-height:1.7;color:var(--muted);">Congratulations on completing your onboarding tasks! Please take a moment to verify that the documents attached below are correct. If you need to update any information, you can use the sidebar to navigate back to previous steps.</p>' +
                    '<div class="tpl1-review-docs">' +
                        '<h4>Attached Documents</h4>' +
                        '<ul>' +
                            attachedDocsList +
                        '</ul>' +
                    '</div>' +
                    '<label class="tpl1-consent">' +
                        '<input type="checkbox" id="betaConsentCheck" ' + (completed.has(index) ? 'checked' : '') + '>' +
                        '<span>I declare that all information and documents provided are true and correct. I agree to the Terms and Conditions.</span>' +
                    '</label>' +
                    '<div class="tpl1-activation-msg" id="betaActivationMessage" role="status" aria-live="polite"></div>' +
                '</div>' +
            '</section>' +
            tpl1Footer(
                'Final onboarding activation step.',
                '<button class="tpl1-btn" type="button" id="betaPrev" ' + (index === 0 ? 'disabled' : '') + '>Prev</button>',
                '<button class="tpl1-btn primary" type="button" id="betaActivate" disabled>Activate Account</button>'
            ) +
        '</div>';
    }

    function formatCertificateCompletionDate(value) {
        var parsed = new Date(value || '');
        if (Number.isNaN(parsed.getTime())) {
            parsed = new Date();
        }
        return parsed.toLocaleDateString('en-US', {
            month: 'long',
            day: '2-digit',
            year: 'numeric'
        });
    }

    function hashCertificateSeed(seed) {
        var hash = 0;
        var text = String(seed || '');
        for (var i = 0; i < text.length; i += 1) {
            hash = ((hash << 5) - hash) + text.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    function deterministicCertificateId(sentAtValue) {
        var parsedDate = new Date(sentAtValue || '');
        if (Number.isNaN(parsedDate.getTime())) {
            parsedDate = new Date();
        }
        var year = parsedDate.getFullYear();
        var userSeed = (root.getAttribute('data-user-id') || '').trim() || currentUserName;
        var seed = userSeed + '|' + String(sentAtValue || '') + '|' + certificateSessionSeed;
        var sequence = String(hashCertificateSeed(seed) % 100000).padStart(5, '0');
        return 'OB-' + year + '-' + sequence;
    }

    function updateCompletionCertificateMeta(payload) {
        if (!payload || typeof payload !== 'object') return;

        if (payload.recipient_email) {
            completionCertificateMeta.recipientEmail = String(payload.recipient_email);
        }

        if (payload.email_backend) {
            completionCertificateMeta.emailBackend = String(payload.email_backend);
        }

        if (payload.error || payload.last_error) {
            completionCertificateMeta.lastEmailError = String(payload.error || payload.last_error);
        } else if (payload.email_status === 'sent') {
            completionCertificateMeta.lastEmailError = '';
        }

        if (payload.sent_at) {
            completionCertificateMeta.sentAt = String(payload.sent_at);
        }

        if (payload.certificate_id) {
            completionCertificateMeta.certificateId = String(payload.certificate_id);
        }

        if (payload.certificate && typeof payload.certificate === 'object') {
            if (payload.certificate.certificateId) {
                completionCertificateMeta.certificateId = String(payload.certificate.certificateId);
            }
            if (payload.certificate.completionDate && !completionCertificateMeta.sentAt) {
                completionCertificateMeta.sentAt = String(payload.certificate.completionDate);
            }
            if (payload.certificate.certificateDescription) {
                completionCertificateMeta.description = String(payload.certificate.certificateDescription);
            }
            if (payload.certificate.templateImageUrl) {
                completionCertificateMeta.templateImageUrl = String(payload.certificate.templateImageUrl);
            }
        }

        if (completionCertificateMeta.sentAt) {
            agentFoundationCompletionEmailTriggered = true;
        }
    }

    function buildCertificateData() {
        var fullName = (root.getAttribute('data-user-name') || currentUserName || 'Agent').trim() || 'Agent';
        var sentAt = completionCertificateMeta.sentAt || new Date().toISOString();
        var certificateId = completionCertificateMeta.certificateId || deterministicCertificateId(sentAt);

        completionCertificateMeta.sentAt = sentAt;
        completionCertificateMeta.certificateId = certificateId;

        return {
            fullName: fullName,
            programTitle: completionCertificateMeta.programTitle,
            certificateDescription: completionCertificateMeta.description,
            templateImageUrl: completionCertificateMeta.templateImageUrl,
            completionDate: formatCertificateCompletionDate(sentAt),
            certificateId: certificateId,
            issuedBy: completionCertificateMeta.issuedBy,
            issuedTitle: completionCertificateMeta.issuedTitle,
            logoUrl: completionCertificateMeta.logoUrl
        };
    }

    function congratulationsMarkup() {
        // Certification Panel: show completed state with user data
        var certPanel = new CertificationPanel({
            completed: true,
            certificateData: buildCertificateData(),
            onDownload: async function(cert, context) {
                var loadingButtons = document.querySelectorAll('[data-cert-action="download"][data-cert-loading="1"]');
                loadingButtons.forEach(function (btn) {
                    btn.textContent = 'Generating PDF...';
                });

                var certId = cert && cert.certificateId ? String(cert.certificateId) : 'certificate';
                var safeCertId = certId.replace(/[^a-zA-Z0-9_-]+/g, '-');
                var fileName = 'Certificate-' + safeCertId + '.pdf';
                var targetElement = context && context.element ? context.element : document.querySelector('.cert-section .cert-inner');
                var pdfHelper = context && typeof context.downloadCertificateAsPdf === 'function'
                    ? context.downloadCertificateAsPdf
                    : window.downloadCertificateAsPdf;

                if (typeof pdfHelper === 'function') {
                    await pdfHelper(targetElement || '.cert-section .cert-inner', fileName, {
                        targetDPI: 300,
                        scaleCap: 3.5,
                        expandCrop: 0
                    });
                    return true;
                }

                // Safe fallback to current image export if PDF dependencies fail to load.
                await generateCertificateImage(cert, 'png');
                return true;
            }
        });

        return certPanel.render();
    }

    function downloadBlobAsFile(blob, fileName) {
        var anchor = document.createElement('a');
        var objectUrl = window.URL.createObjectURL(blob);
        anchor.href = objectUrl;
        anchor.download = fileName;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        window.setTimeout(function () {
            window.URL.revokeObjectURL(objectUrl);
            if (anchor.parentNode) {
                anchor.parentNode.removeChild(anchor);
            }
        }, 0);
    }

    function canvasToBlob(canvas, mimeType, quality) {
        return new Promise(function (resolve, reject) {
            canvas.toBlob(function (blob) {
                if (!blob) {
                    reject(new Error('Failed to create image blob.'));
                    return;
                }
                resolve(blob);
            }, mimeType, quality);
        });
    }

    async function generateCertificateImage(cert, format) {
        var tempWrapper = null;
        var friendlyError = 'Unable to generate certificate image right now. Please try again.';

        try {
            var normalizedFormat = String(format || 'png').toLowerCase();
            if (normalizedFormat !== 'png' && normalizedFormat !== 'jpeg' && normalizedFormat !== 'jpg') {
                alert('Only JPEG or PNG downloads are supported.');
                return;
            }

            var sourceScale = document.querySelector('.cert-section .cert-canvas-scale');
            var sourceFrame = sourceScale || document.querySelector('.cert-section .cert-canvas-frame') || document.querySelector('.cert-document');
            if (!sourceFrame) {
                throw new Error('Certificate node not found (.cert-canvas-scale/.cert-canvas-frame/.cert-document).');
            }

            var sourceSection = sourceFrame.closest('.cert-section') || document.querySelector('.cert-section');
            var measuredFrame = sourceFrame.classList.contains('cert-canvas-scale')
                ? (sourceFrame.querySelector('.cert-document') || sourceFrame)
                : sourceFrame;
            var measuredWidth = measuredFrame && measuredFrame.getBoundingClientRect
                ? measuredFrame.getBoundingClientRect().width
                : 0;
            var fixedWidth = Number.isFinite(measuredWidth) && measuredWidth > 0
                ? measuredWidth
                : 960;

            if (sourceSection) {
                var fixedWidthVar = parseFloat(window.getComputedStyle(sourceSection).getPropertyValue('--cert-fixed-width'));
                if (Number.isFinite(fixedWidthVar) && fixedWidthVar > 0) {
                    fixedWidth = fixedWidthVar;
                }
            }

            fixedWidth = Math.min(1400, Math.max(320, fixedWidth));
            // Certificate template design dimensions: 980 × 680 px
            var certAspectH = Math.round(fixedWidth * 680 / 980);

            if (typeof window.html2canvas !== 'function') {
                throw new Error('html2canvas library is unavailable.');
            }

            tempWrapper = document.createElement('div');
            tempWrapper.setAttribute('aria-hidden', 'true');
            tempWrapper.style.position = 'fixed';
            tempWrapper.style.left = '-10000px';
            tempWrapper.style.top = '0';
            tempWrapper.style.padding = '24px';
            tempWrapper.style.background = '#ffffff';
            tempWrapper.style.zIndex = '-1';

            var exportRoot = document.createElement('div');
            exportRoot.className = 'cert-export-root';
            exportRoot.style.display = 'inline-block';
            exportRoot.style.width = Math.ceil(fixedWidth) + 'px';
            exportRoot.style.maxWidth = Math.ceil(fixedWidth) + 'px';
            exportRoot.style.height = 'auto';
            exportRoot.style.minHeight = '0';
            exportRoot.style.margin = '0';
            exportRoot.style.padding = '0';
            exportRoot.style.background = '#ffffff';

            var exportSection = document.createElement('section');
            exportSection.className = 'cert-export-section';
            exportSection.style.display = 'inline-block';
            exportSection.style.width = Math.ceil(fixedWidth) + 'px';
            exportSection.style.maxWidth = Math.ceil(fixedWidth) + 'px';
            exportSection.style.height = certAspectH + 'px';
            exportSection.style.minHeight = '0';
            exportSection.style.margin = '0';
            exportSection.style.padding = '0';
            exportSection.style.background = '#ffffff';
            exportSection.style.border = '0';
            exportSection.style.boxShadow = 'none';
            exportSection.style.setProperty('--cert-fixed-width', String(Math.ceil(fixedWidth)) + 'px');

            var cloneScale = sourceFrame.cloneNode(true);
            var exportScaleNode;
            if (cloneScale.classList && cloneScale.classList.contains('cert-canvas-scale')) {
                exportScaleNode = cloneScale;
            } else {
                exportScaleNode = document.createElement('div');
                exportScaleNode.className = 'cert-canvas-scale';
                exportScaleNode.appendChild(cloneScale);
            }

            exportScaleNode.style.width = Math.ceil(fixedWidth) + 'px';
            exportScaleNode.style.maxWidth = Math.ceil(fixedWidth) + 'px';
            exportScaleNode.style.display = 'inline-block';
            exportScaleNode.style.height = certAspectH + 'px';
            exportScaleNode.style.minHeight = '0';
            exportScaleNode.style.transform = 'none';
            exportScaleNode.style.transformOrigin = 'top left';
            exportScaleNode.style.margin = '0';
            exportScaleNode.style.padding = '0';
            exportScaleNode.style.background = '#ffffff';

            var exportDoc = exportScaleNode.querySelector('.cert-document') || (exportScaleNode.classList.contains('cert-document') ? exportScaleNode : null);
            if (exportDoc) {
                var hasTemplateBaseImage = !!exportDoc.querySelector('.cert-template-image');
                exportDoc.style.background = hasTemplateBaseImage
                    ? 'transparent'
                    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.2)), repeating-linear-gradient(0deg, rgba(31, 42, 68, 0.01) 0, rgba(31, 42, 68, 0.01) 1px, transparent 1px, transparent 6px), #f6f1e5';
                exportDoc.style.border = hasTemplateBaseImage ? '0' : '1px solid rgba(176, 145, 92, 0.66)';
                exportDoc.style.color = '#1f2a44';
                exportDoc.style.boxShadow = 'none';
                exportDoc.style.width = Math.ceil(fixedWidth) + 'px';
                exportDoc.style.maxWidth = Math.ceil(fixedWidth) + 'px';
                exportDoc.style.height = certAspectH + 'px';
            }

            exportSection.appendChild(exportScaleNode);
            exportRoot.appendChild(exportSection);
            tempWrapper.appendChild(exportRoot);
            document.body.appendChild(tempWrapper);

            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }

            var captureNode = exportScaleNode || exportSection;
            var canvas = await window.html2canvas(captureNode, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            var certId = cert && cert.certificateId ? String(cert.certificateId) : 'UNKNOWN';
            var safeCertId = certId.replace(/[^a-zA-Z0-9_-]+/g, '-');

            if (normalizedFormat === 'png') {
                var pngBlob = await canvasToBlob(canvas, 'image/png');
                downloadBlobAsFile(pngBlob, 'InnerSPARC-Certificate-' + safeCertId + '.png');
                return;
            }

            var jpegBlob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
            downloadBlobAsFile(jpegBlob, 'InnerSPARC-Certificate-' + safeCertId + '.jpg');
        } catch (error) {
            console.error('Certificate image generation failed.', {
                error: error,
                cert: cert
            });
            alert(friendlyError);
            throw error;
        } finally {
            if (tempWrapper && tempWrapper.parentNode) {
                tempWrapper.parentNode.removeChild(tempWrapper);
            }
        }
    }

    function wireCongratulationsPanel() {
        syncActivationMessageViews();

        var prevBtn = document.getElementById('betaCongratsPrev');
        if (!prevBtn) return;

        prevBtn.addEventListener('click', function () {
            showCongratsPanel = false;
            current = reviewStepIndex();
            syncOpenGroupForIndex(current);
            renderAll({ animatePanel: true });
        });
    }

    function wireVideoLoomStep(index) {
        if (!panelEl) return;
        var step = steps[index];
        if (!step || step.type !== 'video' || step.group !== 'VIDEO LOOM') return;

        var videoEl = panelEl.querySelector('.tpl1-video-loom-video');
        if (!videoEl) return;

        if (videoEl.__tpl1VideoLoomEndedBound) return;
        videoEl.__tpl1VideoLoomEndedBound = true;

        // Deferred load: don't set `src` until the user initiates playback.
        if (videoEl.getAttribute('data-src')) {
            var onFirstPlay = function () {
                var src = videoEl.getAttribute('data-src');
                if (src) {
                    videoEl.removeAttribute('data-src');
                    try {
                        videoEl.src = src;
                        videoEl.load();
                        var p = videoEl.play();
                        if (p && typeof p.catch === 'function') p.catch(function () {});
                    } catch (e) {}
                }
            };
            videoEl.addEventListener('play', onFirstPlay, { once: true });
            videoEl.addEventListener('click', onFirstPlay, { once: true });
            videoEl.addEventListener('touchstart', onFirstPlay, { once: true });
        }

        videoEl.addEventListener('ended', function () {
            completeStep(index, { showAlertOnError: false });
        });
    }

    function wireCommonNavigation(index) {
        var prev = document.getElementById('betaPrev');
        if (prev) {
            prev.addEventListener('click', function () {
                if (index > 0) {
                    current = index - 1;
                    syncOpenGroupForIndex(current);
                    renderAll({ animatePanel: true });
                }
            });
        }

        var next = document.getElementById('betaNext');
        var allowVideoLoomSkip = Boolean(steps[index] && steps[index].group === 'VIDEO LOOM');
        if (next && allowVideoLoomSkip) {
            next.disabled = false;
            next.addEventListener('click', async function () {
                await completeStep(index, { showAlertOnError: false });
            });
        }
    }

    function renderVideoLoomInlineVideo(stepIndex) {
        var step = steps[stepIndex];
        if (!step || step.type !== 'video' || step.group !== 'VIDEO LOOM' || !panelEl) return;

        var videoSrc = getVideoSrcFromContentId(step.contentId, step.videoSrc);
        var resolvedVideoSrc = resolvePossibleDriveUrl(videoSrc) || videoSrc;
        var thumbSrc = resolveStepThumbnailSrc(step);

        var trainingShell = panelEl.querySelector('.tpl1-training-shell');
        if (!trainingShell) return;

        var existingInline = trainingShell.querySelector('.tpl1-video-loom-inline');
        if (existingInline && existingInline.parentNode) {
            existingInline.parentNode.removeChild(existingInline);
        }

        var inlineHost = document.createElement('section');
        inlineHost.className = 'tpl1-video-loom-inline';
        inlineHost.innerHTML =
                '<div class="tpl1-video-loom-frame">' +
                '<video class="tpl1-video-loom-video" controls playsinline preload="none" poster="' + escapeHtmlAttr(thumbSrc) + '" data-src="' + escapeHtmlAttr(resolvedVideoSrc) + '">' +
                    'Your browser does not support HTML5 video.' +
                '</video>' +
            '</div>' +
            '<div class="tpl1-video-loom-meta">' +
                '<h3 class="tpl1-video-loom-title">' + escapeHtmlAttr(step.title || 'Video') + '</h3>' +
            '</div>';

        var moduleSection = trainingShell.querySelector('.tpl1-training-module');
        if (moduleSection && moduleSection.parentNode) {
            moduleSection.parentNode.insertBefore(inlineHost, moduleSection.nextSibling);
        } else {
            trainingShell.appendChild(inlineHost);
        }

        var videoEl = inlineHost.querySelector('video');
        if (videoEl) {
            videoEl.addEventListener('ended', function () {
                completeStep(stepIndex, { showAlertOnError: false });
            }, { once: true });
            try { videoEl.scrollIntoView({ block: 'nearest' }); } catch (e) {}
        }
    }

    function wireVideoStep(index) {
        var next = document.getElementById('betaNext');
        var cards = Array.prototype.slice.call(panelEl.querySelectorAll('[data-training-card]'));

        // VIDEO LOOM: no comments, no quiz modal, inline playback.
        var currentStep = steps[index];
        if (currentStep && currentStep.group === 'VIDEO LOOM') {
            cards.forEach(function (card) {
                if (card.__tpl1VideoLoomBound) return;
                card.__tpl1VideoLoomBound = true;
                card.addEventListener('click', function () {
                    var stepIndex = Number(card.getAttribute('data-training-card'));
                    if (Number.isNaN(stepIndex)) return;
                    if (getTrainingCardStatus(stepIndex) === 'locked') return;
                    renderVideoLoomInlineVideo(stepIndex);
                });
            });
            return;
        }

        var commentToggle = panelEl.querySelector('[data-training-comment-toggle]');
        var commentInput = panelEl.querySelector('[data-training-comment-input]');
        var commentPanel = panelEl.querySelector('[data-training-comment-panel]');
        var commentSubmit = panelEl.querySelector('[data-training-comment-submit]');
        var commentList = panelEl.querySelector('[data-training-comment-list]');
        var replyBar = panelEl.querySelector('[data-training-reply-bar]');
        var replyBarName = panelEl.querySelector('[data-training-reply-name]');
        var replyBarPreview = panelEl.querySelector('[data-training-reply-preview]');
        var replyCancelBtn = panelEl.querySelector('[data-training-reply-cancel]');
        var panelCommentMenu = panelEl.querySelector('[data-training-comment-menu]');
        var commentMenu = panelCommentMenu;
        var existingGlobalCommentMenu = document.querySelector('[data-training-comment-menu-global="1"]');
        if (existingGlobalCommentMenu) {
            commentMenu = existingGlobalCommentMenu;
            if (panelCommentMenu && panelCommentMenu !== existingGlobalCommentMenu && panelCommentMenu.parentNode) {
                panelCommentMenu.parentNode.removeChild(panelCommentMenu);
            }
        } else if (panelCommentMenu) {
            panelCommentMenu.setAttribute('data-training-comment-menu-global', '1');
            document.body.appendChild(panelCommentMenu);
            commentMenu = panelCommentMenu;
        }
        var activeModuleId = getActiveTrainingModuleId();
        var commentState = getTrainingModuleCommentState(activeModuleId);
        var commentAuthorName = currentUserName || 'Agent';
        var moduleFooter = panelEl.querySelector('[data-training-module-footer]');
        var activeModuleComplete = Boolean(moduleFooter && moduleFooter.getAttribute('data-module-complete') === 'true');
        var cachedComments = [];
        var replyToCommentId = null;

        if (wireVideoStep.__commentTimeTicker) {
            window.clearInterval(wireVideoStep.__commentTimeTicker);
            wireVideoStep.__commentTimeTicker = null;
        }

        if (wireVideoStep.__commentsPollTimer && wireVideoStep.__commentsPollModuleId !== activeModuleId) {
            window.clearInterval(wireVideoStep.__commentsPollTimer);
            wireVideoStep.__commentsPollTimer = null;
            wireVideoStep.__commentsPollModuleId = '';
        }

        function buildCommentElement(commentObj) {
            var normalized = normalizeTrainingCommentEntry(commentObj, commentAuthorName);
            if (!normalized) return null;
            var host = document.createElement('div');
            host.innerHTML = renderTrainingCommentItem(normalized, commentAuthorName);
            return host.firstElementChild;
        }

        function refreshCommentTimestamps(scopeEl) {
            var scope = scopeEl || commentList;
            if (!scope) return;
            var timeEls = scope.querySelectorAll('[data-training-comment-time]');
            timeEls.forEach(function (timeEl) {
                var createdAtMs = parseCommentTimestampMs(timeEl.getAttribute('data-comment-created-at'));
                if (!isFinite(createdAtMs) || createdAtMs <= 0) return;
                timeEl.textContent = formatCommentTimestamp(createdAtMs);
            });
        }

        function startCommentTimestampTicker() {
            refreshCommentTimestamps(commentList);
            if (wireVideoStep.__commentTimeTicker) return;
            wireVideoStep.__commentTimeTicker = window.setInterval(function () {
                refreshCommentTimestamps(commentList);
            }, 30000);
        }

        function renderCommentsList(comments, options) {
            if (!commentList) return;
            options = options || {};
            var shouldAnimate = options.animate !== false;
            var REPLY_STEP = 22;
            var GUIDE_BASE_LEFT = 9;

            var normalizedComments = (comments || []).map(function (commentObj) {
                return normalizeTrainingCommentEntry(commentObj, commentAuthorName);
            }).filter(Boolean);

            normalizedComments.sort(function (a, b) {
                var aTime = Number(a && a.createdAt) || 0;
                var bTime = Number(b && b.createdAt) || 0;
                if (bTime !== aTime) return bTime - aTime;
                var aId = Number(a && a.id) || 0;
                var bId = Number(b && b.id) || 0;
                return bId - aId;
            });

            var byId = Object.create(null);
            normalizedComments.forEach(function (commentObj) {
                if (!commentObj || !commentObj.id) return;
                byId[String(commentObj.id)] = commentObj;
            });

            var childrenByParent = Object.create(null);
            var topLevelComments = [];

            normalizedComments.forEach(function (commentObj) {
                var parentKey = commentObj && commentObj.parentId != null ? String(commentObj.parentId) : '';
                if (parentKey && byId[parentKey]) {
                    if (!childrenByParent[parentKey]) {
                        childrenByParent[parentKey] = [];
                    }
                    childrenByParent[parentKey].push(commentObj);
                    return;
                }
                topLevelComments.push(commentObj);
            });

            var threadedEntries = [];
            var visitedById = Object.create(null);

            function appendThread(node, depth, ancestorHasNext, isFirstSibling, isLastSibling) {
                if (!node || !node.id) return;
                var nodeKey = String(node.id);
                if (visitedById[nodeKey]) return;
                visitedById[nodeKey] = true;
                var childNodes = childrenByParent[nodeKey] || [];

                threadedEntries.push({
                    comment: node,
                    depth: depth || 0,
                    ancestorHasNext: Array.isArray(ancestorHasNext) ? ancestorHasNext.slice() : [],
                    isFirstSibling: Boolean(isFirstSibling),
                    isLastSibling: Boolean(isLastSibling),
                    hasChildren: childNodes.length > 0
                });

                childNodes.forEach(function (childNode, idx) {
                    var nextAncestor = Array.isArray(ancestorHasNext) ? ancestorHasNext.slice() : [];
                    nextAncestor.push(!isLastSibling);
                    appendThread(
                        childNode,
                        (depth || 0) + 1,
                        nextAncestor,
                        idx === 0,
                        idx === childNodes.length - 1
                    );
                });
            }

            topLevelComments.forEach(function (commentObj, idx) {
                appendThread(
                    commentObj,
                    0,
                    [],
                    idx === 0,
                    idx === topLevelComments.length - 1
                );
            });

            normalizedComments.forEach(function (commentObj) {
                appendThread(commentObj, 0, [], false, true);
            });

            var threadedComments = threadedEntries.map(function (entry) {
                return entry.comment;
            });

            cachedComments = threadedComments.slice();
            commentState.comments = threadedComments.slice();
            commentList.innerHTML = '';

            function attachThreadGuides(el, entryMeta) {
                if (!el || !entryMeta || entryMeta.depth < 1) return;

                el.classList.add('is-reply');
                el.style.setProperty('--tpl1-reply-depth', String(entryMeta.depth));

                var host = document.createElement('span');
                host.className = 'tpl1-thread-guides';

                var currentLine = document.createElement('span');
                currentLine.className = 'tpl1-thread-line is-current' +
                    (entryMeta.isFirstSibling ? ' is-first' : '') +
                    (entryMeta.isLastSibling ? ' is-last' : '') +
                    (entryMeta.hasChildren ? '' : ' is-leaf');
                currentLine.style.left = (GUIDE_BASE_LEFT + ((entryMeta.depth - 1) * REPLY_STEP)) + 'px';
                host.appendChild(currentLine);

                el.insertBefore(host, el.firstChild);
            }

            threadedEntries.forEach(function (entry, idx) {
                var commentObj = entry.comment;
                var el = buildCommentElement(commentObj);
                if (!el) return;

                attachThreadGuides(el, entry);

                commentList.appendChild(el);
                if (shouldAnimate) {
                    applyPopAnimation(el, idx * 45);
                }
            });

            hydrateTrainingCommentCoins(commentList);
            refreshCommentTimestamps(commentList);
        }

        function cancelReply() {
            replyToCommentId = null;
            if (replyBar) {
                replyBar.style.display = 'none';
                replyBar.style.animation = '';
            }
        }

        function showReplyBar(commentId) {
            var target = cachedComments.find(function (item) {
                return String(item.id) === String(commentId);
            });
            if (!target) return;

            replyToCommentId = target.id;
            if (!replyBar) return;

            if (replyBarName) {
                replyBarName.textContent = target.username || 'Agent';
            }
            if (replyBarPreview) {
                var trimmed = String(target.text || '');
                replyBarPreview.textContent = trimmed.slice(0, 40) + (trimmed.length > 40 ? '...' : '');
            }

            replyBar.style.display = 'flex';
            replyBar.style.animation = 'replyBarIn 0.16s ease-out forwards';
            if (commentInput) {
                try {
                    commentInput.focus();
                } catch (err) {}
            }
        }

        function syncCommentComposerState() {
            if (!commentInput) return;
            var hasText = Boolean(String(commentInput.value || '').trim());
            if (commentSubmit) {
                commentSubmit.disabled = !activeModuleComplete || !hasText;
                commentSubmit.setAttribute('aria-disabled', String(commentSubmit.disabled));
            }
        }

        function findCommentIndexById(commentId) {
            if (!commentId || !Array.isArray(commentState.comments)) return -1;
            for (var i = 0; i < commentState.comments.length; i += 1) {
                var entry = commentState.comments[i];
                if (entry && String(entry.id || '') === String(commentId)) {
                    return i;
                }

                var normalized = normalizeTrainingCommentEntry(entry, commentAuthorName);
                if (normalized && String(normalized.id) === String(commentId)) {
                    commentState.comments[i] = normalized;
                    return i;
                }
            }
            return -1;
        }

        function closeActiveCommentMenu() {
            var activeMenu = wireVideoStep.__activeCommentMenu;
            if (!activeMenu) return;
            activeMenu.classList.remove('is-open');
            activeMenu.setAttribute('aria-hidden', 'true');
            activeMenu.style.left = '';
            activeMenu.style.top = '';
            wireVideoStep.__activeCommentMenu = null;
            wireVideoStep.__activeCommentRow = null;
            wireVideoStep.__activeCommentId = null;
            wireVideoStep.__activeCommentIsMine = false;
        }

        function positionCommentMenuNearRow(menu, row) {
            if (!menu || !row) return;
            if (!row.isConnected) {
                closeActiveCommentMenu();
                return;
            }

            var rowRect = row.getBoundingClientRect();
            if (rowRect.width <= 0 || rowRect.height <= 0) {
                closeActiveCommentMenu();
                return;
            }

            var isCompletelyAbove = rowRect.bottom <= 0;
            var isCompletelyBelow = rowRect.top >= window.innerHeight;
            var isCompletelyLeft = rowRect.right <= 0;
            var isCompletelyRight = rowRect.left >= window.innerWidth;
            if (isCompletelyAbove || isCompletelyBelow || isCompletelyLeft || isCompletelyRight) {
                closeActiveCommentMenu();
                return;
            }

            var preferredX = rowRect.right - 12;
            var preferredY = rowRect.top + 4;

            menu.style.left = Math.max(8, preferredX) + 'px';
            menu.style.top = Math.max(8, preferredY) + 'px';

            var menuRect = menu.getBoundingClientRect();
            var maxLeft = window.innerWidth - menuRect.width - 8;
            var maxTop = window.innerHeight - menuRect.height - 8;

            var clampedLeft = Math.min(Math.max(8, preferredX - menuRect.width), Math.max(8, maxLeft));
            var clampedTop = Math.min(Math.max(8, preferredY), Math.max(8, maxTop));

            menu.style.left = clampedLeft + 'px';
            menu.style.top = clampedTop + 'px';
        }

        function repositionActiveCommentMenu() {
            var activeMenu = wireVideoStep.__activeCommentMenu;
            var activeRow = wireVideoStep.__activeCommentRow;
            if (!activeMenu || !activeRow) return;
            positionCommentMenuNearRow(activeMenu, activeRow);
        }

        function openCommentMenuAt(menu, row, commentId, isMine) {
            closeActiveCommentMenu();
            if (!menu || !row || !commentId) return;

            var editItem = menu.querySelector('[data-ctx="edit"]');
            var deleteItem = menu.querySelector('[data-ctx="delete"]');
            var dividerItem = menu.querySelector('[data-ctx="divider"]');
            var canManage = Boolean(isMine);
            if (editItem) editItem.style.display = canManage ? '' : 'none';
            if (deleteItem) deleteItem.style.display = canManage ? '' : 'none';
            if (dividerItem) dividerItem.style.display = canManage ? '' : 'none';

            menu.classList.add('is-open');
            menu.setAttribute('aria-hidden', 'false');

            positionCommentMenuNearRow(menu, row);

            wireVideoStep.__activeCommentMenu = menu;
            wireVideoStep.__activeCommentRow = row;
            wireVideoStep.__activeCommentId = String(commentId);
            wireVideoStep.__activeCommentIsMine = canManage;
        }

        function ensureGlobalCommentMenuHandlers() {
            if (wireVideoStep.__globalCommentMenuBound) return;

            document.addEventListener('click', function (event) {
                var activeMenu = wireVideoStep.__activeCommentMenu;
                if (!activeMenu) return;
                if (activeMenu.contains(event.target)) return;
                closeActiveCommentMenu();
            });

            document.addEventListener('keydown', function (event) {
                if (event.key === 'Escape') {
                    closeActiveCommentMenu();
                }
            });

            document.addEventListener('scroll', function () {
                if (wireVideoStep.__menuScrollTicking) return;
                wireVideoStep.__menuScrollTicking = true;
                window.requestAnimationFrame(function () {
                    wireVideoStep.__menuScrollTicking = false;
                    repositionActiveCommentMenu();
                });
            }, true);

            window.addEventListener('resize', function () {
                repositionActiveCommentMenu();
            }, { passive: true });

            wireVideoStep.__globalCommentMenuBound = true;
        }

        function stopCommentsAutoRefresh() {
            if (!wireVideoStep.__commentsPollTimer) return;
            window.clearInterval(wireVideoStep.__commentsPollTimer);
            wireVideoStep.__commentsPollTimer = null;
            wireVideoStep.__commentsPollModuleId = '';
        }

        function startCommentsAutoRefresh() {
            if (!activeModuleComplete || !commentState.isOpen || !commentList || !activeModuleId) return;
            if (wireVideoStep.__commentsPollTimer && wireVideoStep.__commentsPollModuleId === activeModuleId) return;

            stopCommentsAutoRefresh();
            wireVideoStep.__commentsPollModuleId = activeModuleId;
            wireVideoStep.__commentsPollTimer = window.setInterval(function () {
                if (document.hidden) return;
                if (!commentState.isOpen) return;
                if (commentList.querySelector('.tpl1-training-comment-item.is-editing')) return;
                loadComments({
                    silent: true,
                    animate: false
                });
            }, 4000);
        }

        async function loadComments(options) {
            options = options || {};
            if (!activeModuleId || !commentList) return;
            if (wireVideoStep.__commentLoadInFlight) return;

            wireVideoStep.__commentLoadInFlight = true;
            try {
                var response = await fetch('/portal-onboarding/comments/?module_id=' + encodeURIComponent(activeModuleId), {
                    credentials: 'same-origin'
                });
                var data = await response.json();
                if (response.ok && data && data.ok && Array.isArray(data.comments)) {
                    renderCommentsList(data.comments, {
                        animate: options.animate !== false
                    });
                }
            } catch (error) {
                if (!options.silent) {
                    console.warn('Could not load comments:', error);
                }
            } finally {
                wireVideoStep.__commentLoadInFlight = false;
            }
        }

        async function postCommentRequest(payload) {
            try {
                var response = await fetch('/portal-onboarding/comments/create/', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error('POST /portal-onboarding/comments/create/ failed with status ' + response.status);
                return await response.json();
            } catch (error) {
                console.warn('Unable to post comment to server.', error);
                return null;
            }
        }

        async function patchCommentRequest(commentId, payload) {
            try {
                var response = await fetch('/portal-onboarding/comments/' + encodeURIComponent(commentId) + '/edit/', {
                    method: 'PATCH',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error('PATCH /portal-onboarding/comments/<id>/edit/ failed with status ' + response.status);
                return await response.json();
            } catch (error) {
                console.warn('Unable to edit comment on server.', error);
                return null;
            }
        }

        async function deleteCommentRequest(commentId) {
            try {
                var response = await fetch('/portal-onboarding/comments/' + encodeURIComponent(commentId) + '/delete/', {
                    method: 'DELETE',
                    credentials: 'same-origin',
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken')
                    }
                });
                if (!response.ok && response.status !== 204) {
                    throw new Error('DELETE /portal-onboarding/comments/<id>/delete/ failed with status ' + response.status);
                }
                if (response.status === 204) {
                    return { ok: true };
                }
                return await response.json();
            } catch (error) {
                console.warn('Unable to delete comment on server.', error);
                return null;
            }
        }

        function setCommentRowEditing(row, isEditing) {
            if (!row) return;
            row.classList.toggle('is-editing', Boolean(isEditing));

            var textEl = row.querySelector('[data-training-comment-text]');
            var editWrap = row.querySelector('[data-training-comment-edit]');
            var inputEl = row.querySelector('[data-training-comment-edit-input]');

            if (!textEl || !editWrap || !inputEl) return;

            if (isEditing) {
                var existingText = textEl.textContent || '';
                inputEl.value = existingText;
                textEl.hidden = true;
                editWrap.hidden = false;
                window.requestAnimationFrame(function () {
                    try {
                        inputEl.focus();
                        inputEl.select();
                    } catch (err) {}
                });
            } else {
                textEl.hidden = false;
                editWrap.hidden = true;
            }
        }

        async function persistCommentEdit(row, commentId) {
            if (!row || !commentId) return;
            var inputEl = row.querySelector('[data-training-comment-edit-input]');
            var textEl = row.querySelector('[data-training-comment-text]');
            if (!inputEl || !textEl) return;

            var nextText = String(inputEl.value || '').trim();
            if (!nextText) {
                setCommentRowEditing(row, false);
                return;
            }

            var result = await patchCommentRequest(commentId, {
                text: nextText
            });

            if (result && result.ok && result.comment) {
                var normalized = normalizeTrainingCommentEntry(result.comment, commentAuthorName);
                var commentIdx = findCommentIndexById(commentId);
                if (normalized && commentIdx > -1) {
                    commentState.comments[commentIdx] = normalized;
                }
                textEl.textContent = String(result.comment.text || nextText);
            } else {
                var fallbackIdx = findCommentIndexById(commentId);
                if (fallbackIdx > -1) {
                    var fallbackComment = normalizeTrainingCommentEntry(commentState.comments[fallbackIdx], commentAuthorName);
                    if (fallbackComment) {
                        fallbackComment.text = nextText;
                        commentState.comments[fallbackIdx] = fallbackComment;
                    }
                }
                textEl.textContent = nextText;
            }
            setCommentRowEditing(row, false);
        }

        async function removeCommentRow(row, commentId) {
            if (!row || !commentId) return;
            row.classList.add('is-removing');

            var result = await deleteCommentRequest(commentId);
            if (result && result.ok) {
                var commentIdx = findCommentIndexById(commentId);
                if (commentIdx > -1) {
                    commentState.comments.splice(commentIdx, 1);
                }
                cachedComments = cachedComments.filter(function (item) {
                    return String(item.id) !== String(commentId);
                });
                window.setTimeout(function () {
                    if (row && row.parentNode) {
                        row.parentNode.removeChild(row);
                    }
                }, 180);
            } else {
                row.classList.remove('is-removing');
            }
        }

        if (commentToggle && commentInput && commentPanel) {
            commentToggle.disabled = !activeModuleComplete;
            commentToggle.setAttribute('aria-disabled', String(!activeModuleComplete));
            commentToggle.setAttribute('aria-expanded', String(activeModuleComplete && commentState.isOpen));
            commentInput.disabled = !activeModuleComplete;
            commentInput.value = commentState.text || '';
            commentPanel.classList.toggle('is-open', Boolean(activeModuleComplete && commentState.isOpen));
            renderCommentsList(commentState.comments || [], {
                animate: false
            });
            syncCommentComposerState();
            if (moduleFooter) hydrateTrainingCommentCoins(moduleFooter);

            if (commentMenu) {
                ensureGlobalCommentMenuHandlers();
            }

            if (activeModuleComplete && commentState.isOpen) {
                loadComments({ animate: true });
                startCommentsAutoRefresh();
            } else {
                stopCommentsAutoRefresh();
            }
        }

        if (next) {
            var allowTrainingNextBypass = Boolean(steps[index] && steps[index].group === AGENT_FOUNDATION_GROUP_TITLE);
            var allowVideoLoomSkip = Boolean(steps[index] && steps[index].group === 'VIDEO LOOM');
            next.disabled = allowTrainingNextBypass || allowVideoLoomSkip ? false : !completed.has(index);
            next.addEventListener('click', async function () {
                if (!allowTrainingNextBypass && !allowVideoLoomSkip && !completed.has(index)) return;
                if (allowTrainingNextBypass) {
                    await completeStep(index, { skipServerSave: true, showAlertOnError: false });
                    return;
                }
                await completeStep(index, { showAlertOnError: false });
            });
        }

        if (commentToggle && commentInput && commentPanel) {
            commentToggle.addEventListener('click', function () {
                if (commentToggle.disabled) return;
                commentState.isOpen = !commentState.isOpen;
                commentToggle.setAttribute('aria-expanded', String(commentState.isOpen));
                commentPanel.classList.toggle('is-open', commentState.isOpen);
                if (commentState.isOpen) {
                    loadComments({ animate: true });
                    startCommentsAutoRefresh();
                    window.requestAnimationFrame(function () {
                        try { commentInput.focus(); } catch (err) {}
                    });
                } else {
                    stopCommentsAutoRefresh();
                    cancelReply();
                }
            });

            commentInput.addEventListener('input', function () {
                commentState.text = String(commentInput.value || '');
                syncCommentComposerState();
            });

            commentInput.addEventListener('focus', syncCommentComposerState);
            commentInput.addEventListener('blur', syncCommentComposerState);

            async function submitCommentFromComposer() {
                if (!commentSubmit || commentSubmit.disabled) return;
                var nextComment = String(commentInput.value || '').trim();
                if (!nextComment) return;

                var payload = {
                    module_id: activeModuleId,
                    text: nextComment
                };
                if (replyToCommentId) {
                    payload.parent_id = replyToCommentId;
                }

                var result = await postCommentRequest(payload);

                if (!result || !result.ok || !result.comment) {
                    return;
                }

                var newComment = normalizeTrainingCommentEntry(result.comment, commentAuthorName);
                if (newComment) {
                    commentState.comments.push(newComment);
                }

                commentState.text = '';
                commentInput.value = '';
                cancelReply();
                syncCommentComposerState();
                commentInput.focus();

                if (commentList && newComment) {
                    renderCommentsList(commentState.comments, {
                        animate: false
                    });

                    var rows = commentList.querySelectorAll('.tpl1-training-comment-item[data-comment-id]');
                    var newEl = null;
                    rows.forEach(function (rowEl) {
                        if (newEl) return;
                        if (String(rowEl.getAttribute('data-comment-id') || '') === String(newComment.id)) {
                            newEl = rowEl;
                        }
                    });

                    if (newEl) {
                        applyPopAnimation(newEl, 0);
                        hydrateTrainingCommentCoins(newEl);
                        refreshCommentTimestamps(newEl);
                        if (typeof newEl.scrollIntoView === 'function') {
                            newEl.scrollIntoView({
                                behavior: 'smooth',
                                block: 'nearest'
                            });
                        }
                    }
                } else if (commentList && commentList.firstElementChild && typeof commentList.firstElementChild.scrollIntoView === 'function') {
                    commentList.firstElementChild.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest'
                    });
                }
            }

            if (commentSubmit) {
                commentSubmit.addEventListener('click', submitCommentFromComposer);
            }

            commentInput.addEventListener('keydown', function (event) {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                submitCommentFromComposer();
            });

            if (commentList && commentMenu) {
                commentList.addEventListener('contextmenu', function (event) {
                    var row = event.target && event.target.closest ? event.target.closest('.tpl1-training-comment-item') : null;
                    if (!row) return;
                    event.preventDefault();
                    event.stopPropagation();
                    var commentId = row.getAttribute('data-comment-id');
                    var isMine = String(row.getAttribute('data-is-mine') || '').toLowerCase() === 'true';
                    openCommentMenuAt(commentMenu, row, commentId, isMine);
                });

                commentList.addEventListener('click', function (event) {
                    var saveBtn = event.target && event.target.closest ? event.target.closest('[data-training-comment-save]') : null;
                    if (saveBtn) {
                        var saveRow = saveBtn.closest('.tpl1-training-comment-item');
                        var saveId = saveRow ? saveRow.getAttribute('data-comment-id') : '';
                        persistCommentEdit(saveRow, saveId);
                        return;
                    }

                    var cancelBtn = event.target && event.target.closest ? event.target.closest('[data-training-comment-cancel]') : null;
                    if (cancelBtn) {
                        var cancelRow = cancelBtn.closest('.tpl1-training-comment-item');
                        setCommentRowEditing(cancelRow, false);
                    }
                });

                commentList.addEventListener('keydown', function (event) {
                    var inputEl = event.target && event.target.closest ? event.target.closest('[data-training-comment-edit-input]') : null;
                    if (!inputEl) return;
                    var row = inputEl.closest('.tpl1-training-comment-item');
                    var commentId = row ? row.getAttribute('data-comment-id') : '';

                    if (event.key === 'Enter') {
                        event.preventDefault();
                        persistCommentEdit(row, commentId);
                    }

                    if (event.key === 'Escape') {
                        event.preventDefault();
                        setCommentRowEditing(row, false);
                    }
                });
            }

            if (commentMenu && !commentMenu.__trainingMenuBound) {
                commentMenu.addEventListener('click', function (event) {
                    var actionBtn = event.target && event.target.closest ? event.target.closest('[data-training-comment-menu-action]') : null;
                    if (!actionBtn) return;

                    var action = actionBtn.getAttribute('data-training-comment-menu-action');
                    var activeRow = wireVideoStep.__activeCommentRow;
                    var activeCommentId = wireVideoStep.__activeCommentId;
                    var canManage = Boolean(wireVideoStep.__activeCommentIsMine);
                    var replyHandler = commentMenu.__showReplyBar;
                    var editHandler = commentMenu.__setCommentRowEditing;
                    var deleteHandler = commentMenu.__removeCommentRow;

                    closeActiveCommentMenu();

                    if (action === 'reply') {
                        if (typeof replyHandler === 'function') {
                            replyHandler(activeCommentId);
                        }
                        return;
                    }

                    if (action === 'edit') {
                        if (!canManage) return;
                        if (typeof editHandler === 'function') {
                            editHandler(activeRow, true);
                        }
                        return;
                    }

                    if (action === 'delete') {
                        if (!canManage) return;
                        if (typeof deleteHandler === 'function') {
                            deleteHandler(activeRow, activeCommentId);
                        }
                    }
                });
                commentMenu.__trainingMenuBound = true;
            }

            if (commentMenu) {
                commentMenu.__showReplyBar = showReplyBar;
                commentMenu.__setCommentRowEditing = setCommentRowEditing;
                commentMenu.__removeCommentRow = removeCommentRow;
            }

            startCommentTimestampTicker();

            if (replyCancelBtn && !replyCancelBtn.__replyCancelBound) {
                replyCancelBtn.addEventListener('click', function () {
                    cancelReply();
                });
                replyCancelBtn.__replyCancelBound = true;
            }
        }

        function renderVideoModal(stepIndex, options) {
            var step = steps[stepIndex];
            if (!step || !videoQuizRoot) return;

            options = options || {};
            var isDemoMode = Boolean(options.demoMode);

            var stepAlreadyCompleted = isDemoMode ? false : completed.has(stepIndex);
            var state = isDemoMode
                ? {
                    started: false,
                    passed: false,
                    currentIndex: 0,
                    selectedAnswers: [],
                    attempts: 1,
                    lastScore: null,
                    durationSec: 0,
                    startedAtMs: Date.now(),
                    showResult: false,
                    playbackFinished: true,
                    updatedAt: Date.now()
                }
                : getVideoQuizState(step);
            var quizUnlocked = isDemoMode ? true : stepAlreadyCompleted;
            var modalContentClass = quizUnlocked ? '' : ' quiz-hidden';

            var videoSrc = getVideoSrcFromContentId(step.contentId, step.videoSrc);
            var resolvedVideoSrc = resolvePossibleDriveUrl(videoSrc) || videoSrc;
            var thumbSrc = resolveStepThumbnailSrc(step);
            var quizQuestions = getVideoQuizQuestionsForStep(step).slice(0, 3);

            var mediaMarkup = '<div class="tpl1-training-modal-loader" id="betaTrainingModalLoader" aria-live="polite" role="status">' +
                '<span class="tpl1-training-modal-loader-spinner" aria-hidden="true"></span>' +
                '<span class="tpl1-training-modal-loader-text">Loading video...</span>' +
            '</div>' +
            '<video id="betaTrainingModalVideo" class="tpl1-training-modal-video" controlslist="nodownload noplaybackrate noremoteplayback nofullscreen" disablepictureinpicture disableremoteplayback playsinline preload="metadata" poster="' + escapeHtmlAttr(thumbSrc) + '">' +
                '<source src="' + escapeHtmlAttr(resolvedVideoSrc) + '" type="video/mp4">' +
                'Your browser does not support HTML5 video.' +
            '</video>' +
            '<div class="tpl1-training-modal-controls">' +
                '<div class="tpl1-training-modal-time" id="betaTrainingModalTime" aria-live="polite">--:-- / --:--</div>' +
                '<div class="tpl1-training-modal-volume">' +
                    '<label for="betaTrainingVolumeSlider" class="tpl1-volume-label">Volume</label>' +
                    '<input type="range" id="betaTrainingVolumeSlider" class="tpl1-volume-slider" min="0" max="100" value="100" aria-label="Video volume">' +
                '</div>' +
            '</div>';


            // TEMPORARY DEV/QA SKIP BUTTON
            var skipBtnMarkup = '';
            if (typeof DEV_UNLOCK_ALL_ONBOARDING_STEPS !== 'undefined' && DEV_UNLOCK_ALL_ONBOARDING_STEPS) {
                skipBtnMarkup = '<button type="button" class="tpl1-btn tpl1-btn-skip" id="betaTrainingSkipVideo" style="margin-left:12px;background:#f44336;color:#fff;">Skip Video (Dev)</button>';
            }

            var actionMarkup = '<button type="button" class="tpl1-btn" id="betaTrainingTogglePlayback">Play</button>' + skipBtnMarkup;
            // --- TEMP SKIP BUTTON LOGIC ---
            if (typeof DEV_UNLOCK_ALL_ONBOARDING_STEPS !== 'undefined' && DEV_UNLOCK_ALL_ONBOARDING_STEPS) {
                setTimeout(function () {
                    var skipBtn = document.getElementById('betaTrainingSkipVideo');
                    if (skipBtn) {
                        skipBtn.addEventListener('click', function () {
                            // Mark video as completed and unlock quiz immediately
                            state.playbackFinished = true;
                            state.watchPercent = 100;
                            state.watchSeconds = Math.max(state.watchSeconds || 0, Math.floor(Number(modalVideo && modalVideo.duration) || 0), 1);
                            persistWatchState();
                            unlockQuizPanel();
                            if (hintEl) {
                                hintEl.textContent = 'Skipped for QA/dev. Quiz unlocked.';
                            }
                            if (togglePlaybackBtn) {
                                togglePlaybackBtn.disabled = false;
                                togglePlaybackBtn.textContent = 'Play';
                            }
                            // Optionally, visually indicate skip
                            skipBtn.disabled = true;
                            skipBtn.textContent = 'Skipped';
                        });
                    }
                }, 0);
            }

            var hintText = stepAlreadyCompleted
                ? 'This training video is already completed. You can rewatch it anytime.'
                : (isDemoMode
                    ? 'Demo mode: quiz is unlocked immediately for animation testing.'
                    : 'Watch the video to 100% to unlock the quiz and save completion.');

            videoQuizRoot.innerHTML =
                '<section class="tpl1-training-modal-content' + modalContentClass + '">' +
                    '<div class="tpl1-training-modal-player">' +
                        mediaMarkup +
                        '<div class="tpl1-training-modal-hint" id="betaTrainingModalHint" aria-live="polite">' + hintText + '</div>' +
                        '<div class="tpl1-training-modal-actions">' + actionMarkup + '</div>' +
                    '</div>' +
                    '<section class="tpl1-training-modal-quiz" aria-labelledby="betaTrainingQuizTitle">' +
                        '<h4 id="betaTrainingQuizTitle">Quick Quiz</h4>' +
                        '<p>' + (isDemoMode
                            ? 'Demo mode: answer and submit to trigger the pass animation anytime.'
                            : (stepAlreadyCompleted
                                ? 'Video completed. You can answer the quiz for review.'
                                : 'Quiz unlocks after full video completion.')) + '</p>' +
                        '<div class="tpl1-training-quiz-pass-burst" id="betaTrainingQuizPassBurst" aria-hidden="true">' +
                            '<span class="burst-ring" aria-hidden="true"></span>' +
                            '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>' +
                        '</div>' +
                        '<form id="betaTrainingModalQuizForm" class="tpl1-training-quiz-form"></form>' +
                        '<div class="tpl1-training-quiz-result" id="betaTrainingQuizResult" aria-live="polite">' + (stepAlreadyCompleted ? 'Video already completed.' : '') + '</div>' +
                        '<button type="button" class="tpl1-btn" id="betaTrainingQuizSubmit">Submit Quiz</button>' +
                    '</section>' +
                '</section>';

            var form = document.getElementById('betaTrainingModalQuizForm');
            var submitQuizBtn = document.getElementById('betaTrainingQuizSubmit');
            var resultEl = document.getElementById('betaTrainingQuizResult');
            var hintEl = document.getElementById('betaTrainingModalHint');
            var modalVideo = document.getElementById('betaTrainingModalVideo');
            var modalLoader = document.getElementById('betaTrainingModalLoader');
            var togglePlaybackBtn = document.getElementById('betaTrainingTogglePlayback');
            var quizSection = videoQuizRoot.querySelector('.tpl1-training-modal-quiz');
            var passBurstEl = document.getElementById('betaTrainingQuizPassBurst');
            var modalContent = videoQuizRoot.querySelector('.tpl1-training-modal-content');
            var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            var QUIZ_PASS_ANIMATION_MS = prefersReducedMotion ? 0 : 2000;

            if (!form || !submitQuizBtn || !modalContent) return;
            if (!modalVideo) return;

            modalVideo.controls = false;
            // Explicitly load the current <source> so the network request starts reliably.
            try { modalVideo.load(); } catch (e) {}

            function setVideoLoaderState(isLoading) {
                if (!modalLoader) return;
                modalLoader.classList.toggle('is-hidden', !isLoading);
                modalLoader.setAttribute('aria-hidden', isLoading ? 'false' : 'true');
            }

            setVideoLoaderState(true);

            modalContent.classList.remove('is-ready');
            window.requestAnimationFrame(function () {
                window.requestAnimationFrame(function () {
                    if (modalContent) {
                        modalContent.classList.add('is-ready');
                    }
                });
            });

            form.innerHTML = quizQuestions.map(function (question, qIdx) {
                var choices = (question.choices || []).map(function (choice, cIdx) {
                    return '<label class="tpl1-training-quiz-choice">' +
                        '<input type="radio" name="trainingQuiz' + qIdx + '" value="' + cIdx + '">' +
                        '<span>' + escapeHtmlAttr(choice) + '</span>' +
                    '</label>';
                }).join('');

                return '<fieldset class="tpl1-training-quiz-item">' +
                    '<legend>' + escapeHtmlAttr(question.prompt || ('Question ' + (qIdx + 1))) + '</legend>' +
                    '<div class="tpl1-training-quiz-choices">' + choices + '</div>' +
                '</fieldset>';
            }).join('');

            function runQuizPassAnimation() {
                if (prefersReducedMotion || !quizSection) {
                    return Promise.resolve();
                }

                quizSection.classList.remove('is-pass-animating');
                if (passBurstEl) {
                    passBurstEl.classList.remove('is-active');
                }
                if (form) {
                    form.classList.remove('is-celebrating');
                }
                void quizSection.offsetWidth;
                quizSection.classList.add('is-pass-animating');
                if (passBurstEl) {
                    passBurstEl.classList.add('is-active');
                }
                if (form) {
                    form.classList.add('is-celebrating');
                }

                return new Promise(function (resolve) {
                    window.setTimeout(function () {
                        if (quizSection) {
                            quizSection.classList.remove('is-pass-animating');
                        }
                        if (passBurstEl) {
                            passBurstEl.classList.remove('is-active');
                        }
                        if (form) {
                            form.classList.remove('is-celebrating');
                        }
                        resolve();
                    }, QUIZ_PASS_ANIMATION_MS);
                });
            }

            function applyPassedUiLocked() {
                if (form) {
                    form.classList.add('is-finished');
                    var quizInputs = form.querySelectorAll('input[type="radio"]');
                    quizInputs.forEach(function (inputEl) {
                        inputEl.disabled = true;
                    });
                }
                if (submitQuizBtn) {
                    submitQuizBtn.disabled = true;
                    submitQuizBtn.textContent = 'Quiz Passed';
                }
                if (quizSection) {
                    quizSection.classList.add('is-passed');
                }
                if (resultEl) {
                    resultEl.textContent = 'Quiz already passed.';
                    resultEl.className = 'tpl1-training-quiz-result is-success is-finished';
                }
            }

            function setQuizPassedUiLocked(options) {
                options = options || {};
                var animate = Boolean(options.animate);

                if (!animate) {
                    applyPassedUiLocked();
                    return;
                }

                if (submitQuizBtn) {
                    submitQuizBtn.disabled = true;
                    submitQuizBtn.textContent = 'Finalizing...';
                }
                if (resultEl) {
                    resultEl.textContent = 'Great work. Saving your pass result...';
                    resultEl.className = 'tpl1-training-quiz-result is-success is-celebrating';
                }

                runQuizPassAnimation().then(function () {
                    applyPassedUiLocked();
                });
            }

            var completionInFlight = false;
            var stateSaveLock = false;
            var maxUnlockedWatchTime = 0;
            function persistWatchState() {
                if (isDemoMode) return;
                if (stateSaveLock) return;
                stateSaveLock = true;
                window.requestAnimationFrame(function () {
                    state.updatedAt = Date.now();
                    persistVideoQuizState(step);
                    stateSaveLock = false;
                });
            }

            function unlockQuizPanel() {
                modalContent.classList.remove('quiz-hidden');
            }

            function finalizeVideoCompletion() {
                if (isDemoMode) {
                    unlockQuizPanel();
                    if (hintEl) {
                        hintEl.textContent = 'Demo mode active. Quiz stays unlocked for animation testing.';
                    }
                    return;
                }

                if (stepAlreadyCompleted || completionInFlight) {
                    unlockQuizPanel();
                    return;
                }
                completionInFlight = true;
                completeStep(stepIndex, {
                    extraPayload: {
                        completion_reason: 'watch_complete'
                    }
                }).then(function (saved) {
                    completionInFlight = false;
                    if (!saved) {
                        if (hintEl) {
                            hintEl.textContent = 'Could not save completion. Keep the video open and try replaying the last seconds.';
                        }
                        return;
                    }
                    stepAlreadyCompleted = true;
                    state.playbackFinished = true;
                    state.watchPercent = 100;
                    state.watchSeconds = Math.max(state.watchSeconds || 0, Math.floor(Number(modalVideo && modalVideo.duration) || 0), 1);
                    persistWatchState();
                    unlockQuizPanel();
                    if (hintEl) {
                        hintEl.textContent = 'Playback completed and saved. Quiz unlocked.';
                    }
                    if (togglePlaybackBtn) {
                        togglePlaybackBtn.disabled = false;
                        togglePlaybackBtn.textContent = modalVideo.paused ? 'Play' : 'Pause';
                    }
                });
            }

            function updateWatchProgressState() {
                var duration = Number(modalVideo.duration) || 0;
                var currentTime = Number(modalVideo.currentTime) || 0;
                if (duration <= 0) {
                    return;
                }

                maxUnlockedWatchTime = Math.max(maxUnlockedWatchTime, currentTime);

                var percent = Math.max(0, Math.min(100, (currentTime / duration) * 100));
                state.durationSec = Math.floor(duration);
                state.watchSeconds = Math.max(state.watchSeconds || 0, Math.floor(currentTime));
                state.watchPercent = Math.max(state.watchPercent || 0, percent);

                if (!state.playbackFinished && (percent >= VIDEO_WATCH_COMPLETE_THRESHOLD || modalVideo.ended)) {
                    state.playbackFinished = true;
                }

                persistWatchState();

                updateTimeDisplay();

                if (state.playbackFinished && !stepAlreadyCompleted) {
                    finalizeVideoCompletion();
                }
            }

            function preventSeekHotkeys(event) {
                if (!event || isDemoMode) {
                    return;
                }
                var key = String(event.key || '').toLowerCase();
                if (key === 'arrowleft' || key === 'arrowright' || key === 'j' || key === 'l' || key === 'home' || key === 'end') {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }

            function formatTime(seconds) {
                seconds = Math.floor(seconds || 0);
                var mins = Math.floor(seconds / 60);
                var secs = seconds % 60;
                return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
            }

            function updateTimeDisplay() {
                var timeEl = document.getElementById('betaTrainingModalTime');
                if (!timeEl || !modalVideo) return;
                
                var current = Number(modalVideo.currentTime) || 0;
                var duration = Number(modalVideo.duration) || 0;
                var remaining = Math.max(0, duration - current);
                
                timeEl.textContent = formatTime(current) + ' / ' + formatTime(duration);
            }

            if (isDemoMode) {
                unlockQuizPanel();
                if (resultEl) {
                    resultEl.textContent = 'Demo quiz unlocked.';
                    resultEl.className = 'tpl1-training-quiz-result is-success';
                }
            } else if (stepAlreadyCompleted) {
                unlockQuizPanel();
                if (resultEl) {
                    resultEl.className = 'tpl1-training-quiz-result is-finished';
                }
            } else if (state.playbackFinished) {
                finalizeVideoCompletion();
            }

            if (state.passed) {
                setQuizPassedUiLocked();
            }

            if (modalVideo) {
                modalVideo.addEventListener('loadedmetadata', function () {
                    // Always open training videos from the beginning.
                    modalVideo.currentTime = 0;
                    maxUnlockedWatchTime = 0;
                    updateTimeDisplay();
                });
                modalVideo.addEventListener('loadeddata', function () {
                    setVideoLoaderState(false);
                });
                modalVideo.addEventListener('canplay', function () {
                    setVideoLoaderState(false);
                });
                modalVideo.addEventListener('canplaythrough', function () {
                    setVideoLoaderState(false);
                });
                modalVideo.addEventListener('playing', function () {
                    setVideoLoaderState(false);
                });
                modalVideo.addEventListener('waiting', function () {
                    setVideoLoaderState(true);
                });
                modalVideo.addEventListener('stalled', function () {
                    setVideoLoaderState(true);
                });
                modalVideo.addEventListener('seeking', function () {
                    setVideoLoaderState(true);
                });
                modalVideo.addEventListener('error', function () {
                    setVideoLoaderState(false);
                });
                modalVideo.addEventListener('timeupdate', updateWatchProgressState);
                modalVideo.addEventListener('ended', updateWatchProgressState);
                modalVideo.addEventListener('keydown', preventSeekHotkeys);
                modalVideo.addEventListener('contextmenu', function (event) {
                    event.preventDefault();
                });

                if (togglePlaybackBtn) {
                    togglePlaybackBtn.addEventListener('click', function () {
                        if (modalVideo.paused) {
                            var modalPlayPromise = modalVideo.play();
                            if (modalPlayPromise && typeof modalPlayPromise.catch === 'function') {
                                modalPlayPromise.catch(function (err) {
                                    if (err && err.name === 'AbortError') {
                                        return;
                                    }
                                    if (window.console && typeof window.console.warn === 'function') {
                                        console.warn('Training video play failed:', err);
                                    }
                                });
                            }
                        } else {
                            modalVideo.pause();
                        }
                    });

                    var syncToggleLabel = function () {
                        togglePlaybackBtn.textContent = modalVideo.paused ? 'Play' : 'Pause';
                    };

                    modalVideo.addEventListener('play', syncToggleLabel);
                    modalVideo.addEventListener('pause', syncToggleLabel);
                    modalVideo.addEventListener('ended', syncToggleLabel);
                    syncToggleLabel();
                }

                var volumeSlider = document.getElementById('betaTrainingVolumeSlider');
                if (volumeSlider) {
                    modalVideo.volume = 1;
                    volumeSlider.value = 100;
                    
                    function updateVolumeSliderFill() {
                        var val = Number(volumeSlider.value) || 100;
                        var percent = Math.max(0, Math.min(100, val));
                        var filledColor = 'var(--primary)';
                        var emptyColor = 'color-mix(in srgb, var(--muted) 60%, transparent)';
                        volumeSlider.style.backgroundImage = 'linear-gradient(to right, ' + filledColor + ' 0%, ' + filledColor + ' ' + percent + '%, ' + emptyColor + ' ' + percent + '%, ' + emptyColor + ' 100%)';
                    }
                    
                    updateVolumeSliderFill();
                    
                    volumeSlider.addEventListener('input', function () {
                        modalVideo.volume = Number(volumeSlider.value) / 100;
                        updateVolumeSliderFill();
                    });
                }
            }

            submitQuizBtn.addEventListener('click', function () {
                if (state.passed) {
                    setQuizPassedUiLocked();
                    return;
                }

                if (!isDemoMode && !completed.has(stepIndex)) {
                    if (resultEl) {
                        resultEl.textContent = 'Quiz unlocks only after the video reaches 100% completion.';
                        resultEl.className = 'tpl1-training-quiz-result is-error';
                    }
                    return;
                }

                var answers = quizQuestions.map(function (_, qIdx) {
                    var checked = form.querySelector('input[name="trainingQuiz' + qIdx + '"]:checked');
                    return checked ? Number(checked.value) : null;
                });

                if (answers.some(function (v) { return v === null || Number.isNaN(v); })) {
                    if (resultEl) {
                        resultEl.textContent = 'Please answer all quiz questions before submitting.';
                        resultEl.className = 'tpl1-training-quiz-result is-error';
                    }
                    return;
                }

                var score = calculateQuizScore(quizQuestions, answers);
                state.lastScore = score;
                if (score >= VIDEO_QUIZ_PASS_PERCENT) {
                    state.passed = true;
                    state.showResult = true;
                    state.updatedAt = Date.now();
                    if (!isDemoMode) {
                        persistVideoQuizState(step);
                    }
                    if (resultEl) {
                        resultEl.textContent = 'Quiz passed (' + score + '%).';
                        resultEl.className = 'tpl1-training-quiz-result is-success';
                    }
                    setQuizPassedUiLocked({ animate: true });
                    return;
                }

                state.passed = false;
                state.showResult = true;
                state.updatedAt = Date.now();
                if (!isDemoMode) {
                    persistVideoQuizState(step);
                }

                if (resultEl) {
                    resultEl.textContent = 'Quiz score: ' + score + '%. Passing score is ' + VIDEO_QUIZ_PASS_PERCENT + '%.';
                    resultEl.className = 'tpl1-training-quiz-result is-error';
                }
            });
        }

        cards.forEach(function (card) {
            if (card.__tpl1TrainingCardBound) return;
            card.__tpl1TrainingCardBound = true;
            card.addEventListener('click', function () {
                var stepIndex = Number(card.getAttribute('data-training-card'));
                if (Number.isNaN(stepIndex)) return;
                if (getTrainingCardStatus(stepIndex) === 'locked') {
                    return;
                }
                var isDemoCard = card.hasAttribute('data-demo-card');

                var modalTitle = document.getElementById('tpl1VideoQuizTitle');
                if (modalTitle && steps[stepIndex]) {
                    modalTitle.textContent = isDemoCard
                        ? (steps[stepIndex].title + ' (Demo)')
                        : steps[stepIndex].title;
                }

                card.classList.remove('is-opening');
                void card.offsetWidth;
                card.classList.add('is-opening');
                window.setTimeout(function () {
                    card.classList.remove('is-opening');
                }, 420);

                var cardRect = card.getBoundingClientRect();
                var origin = {
                    x: cardRect.left + (cardRect.width / 2),
                    y: cardRect.top + Math.min(46, cardRect.height / 2)
                };

                activeVideoQuizStepIndex = stepIndex;
                renderVideoModal(stepIndex, { demoMode: isDemoCard });
                setVideoQuizModalOpen(true, origin);
            });
        });
    }

    function wireFormStep(index) {
        var mark = document.getElementById('betaMarkDone');
        var firstNameInput = document.getElementById('betaFirstName');
        var lastNameInput = document.getElementById('betaLastName');
        var emailInput = document.getElementById('betaPrimaryEmail');
        var phoneInput = document.getElementById('betaPrimaryPhone');
        var birthdateInput = document.getElementById('betaBirthdate');
        var genderInput = document.getElementById('betaGender');
        var addressInput = document.getElementById('betaResidentialAddress');
        var profileError = document.getElementById('betaProfileIdentityError');
        var profileStatus = document.getElementById('betaProfileIdentityStatus');

        if (!mark || !firstNameInput || !lastNameInput || !emailInput || !phoneInput || !addressInput) return;

        function setProfileError(message) {
            if (!profileError) return;
            profileError.textContent = message || '';
            profileError.classList.toggle('show', Boolean(message));
        }

        function setProfileStatus(message, isSuccess) {
            if (!profileStatus) return;
            profileStatus.textContent = message || '';
            profileStatus.classList.toggle('show', Boolean(message));
            profileStatus.style.color = isSuccess ? '#1d9f5f' : '#ba2f2f';
        }

        function updateMarkState() {
            var hasFirstName = Boolean((firstNameInput.value || '').trim());
            var hasLastName = Boolean((lastNameInput.value || '').trim());
            var hasEmail = Boolean((emailInput.value || '').trim());
            var hasPhone = normalizeAndValidatePH('betaPhoneUnified', 'betaPrimaryPhone').valid;
            var hasBirthdate = Boolean((birthdateInput && birthdateInput.value || '').trim());
            var hasGender = Boolean((genderInput && genderInput.value || '').trim());
            var hasAddress = Boolean((addressInput.value || '').trim());
            mark.disabled = !(hasFirstName && hasLastName && hasEmail && hasPhone && hasBirthdate && hasGender && hasAddress);
        }

        function refreshPhoneInlineError() {
            var currentValue = (phoneInput.value || '').trim();
            if (!currentValue) {
                return;
            }
            var normalized = normalizeAndValidatePH('betaPhoneUnified', 'betaPrimaryPhone');
            if (!normalized.valid) {
                setProfileError(normalized.message || 'Please enter a valid 10-digit phone number.');
                return;
            }
            if (profileError && profileError.textContent && profileError.textContent.indexOf('phone') !== -1) {
                setProfileError('');
            }
        }

        function attachProfileInputListeners(input) {
            if (!input) return;
            input.addEventListener('input', function () {
                setProfileError('');
                setProfileStatus('', false);
                updateMarkState();
                if (input === phoneInput) {
                    refreshPhoneInlineError();
                }
            });
        }

        attachProfileInputListeners(firstNameInput);
        attachProfileInputListeners(lastNameInput);
        attachProfileInputListeners(emailInput);
        attachProfileInputListeners(phoneInput);
        attachProfileInputListeners(birthdateInput);
        attachProfileInputListeners(genderInput);

        wireProfileIdentityPremiumControls();

        addressInput.addEventListener('input', function () {
            setProfileError('');
            setProfileStatus('', false);
            updateMarkState();
        });
        initPhoneControls();
        refreshPhoneInlineError();
        updateMarkState();

        mark.addEventListener('click', async function () {
            if (mark.disabled) return;
            setProfileError('');
            setProfileStatus('', false);
            mark.disabled = true;

            var formData = new FormData();
            var phoneNormalized = normalizeAndValidatePH('betaPhoneUnified', 'betaPrimaryPhone');
            if (!phoneNormalized.valid) {
                setProfileError(phoneNormalized.message);
                setProfileStatus('', false);
                updateMarkState();
                return;
            }
            var birthdateIso = parseBirthdateDisplayToIso((birthdateInput && birthdateInput.value || '').trim());
            if (!birthdateIso) {
                setProfileError('Please enter a valid birthdate in MM/DD/YYYY format.');
                setProfileStatus('', false);
                updateMarkState();
                return;
            }
            if (birthdateInput) {
                birthdateInput.value = birthdateIso;
            }

            formData.append('first_name', (firstNameInput.value || '').trim());
            formData.append('last_name', (lastNameInput.value || '').trim());
            formData.append('email', (emailInput.value || '').trim());
            formData.append('phone_number', phoneNormalized.local);
            formData.append('birthdate', (birthdateInput.value || '').trim());
            formData.append('gender', (genderInput.value || '').trim());
            formData.append('residential_address', (addressInput.value || '').trim());

            try {
                var response = await fetch(onboardingApi.profileIdentitySaveUrl, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'X-CSRFToken': getCsrfTokenFallback()
                    },
                    body: formData
                });

                var payload = {};
                try {
                    payload = await response.json();
                } catch (jsonError) {
                    payload = {};
                }

                if (!response.ok || !payload.ok) {
                    var fieldErrors = payload.field_errors || {};
                    var reason = buildUploadErrorMessage(response, payload, 'Profile & Identity save failed.');
                    setProfileError(
                        reason
                    );
                    setProfileStatus('', false);
                    updateMarkState();
                    return;
                }

                applyOnboardingProfileData(payload.data || {});
                setProfileStatus('Saved to server', true);
                await completeStep(index);
            } catch (error) {
                console.warn('Profile & Identity save failed.', error);
                var networkReason = 'Network error: ' + (error && error.message ? error.message : 'Unable to reach server.');
                setProfileError(networkReason);
                setProfileStatus('', false);
                updateMarkState();
            }
        });
    }

    function wireIntroStep(index) {
        var next = document.getElementById('betaIntroNext');
        var readyCheck = document.getElementById('betaIntroReadyCheck');
        var introVideo = document.getElementById('betaIntroWelcomeVideo');
        var introVideoFrame = introVideo ? introVideo.closest('.tpl1-intro-video-frame') : null;
        var introVideoPlayBtn = document.getElementById('betaIntroVideoPlay');
        var introVideoControlPlayBtn = document.getElementById('betaIntroVideoControlPlay');
        var introVideoSeek = document.getElementById('betaIntroVideoSeek');
        var introVideoBuffer = document.getElementById('betaIntroVideoBuffer');
        var introVideoCurrentTime = document.getElementById('betaIntroVideoCurrentTime');
        var introVideoCenterDuration = document.getElementById('betaIntroVideoCenterDuration');
        var introVideoVolumeToggle = document.getElementById('betaIntroVideoVolumeToggle');
        var introVideoVolume = document.getElementById('betaIntroVideoVolume');
        var introVideoLoading = document.getElementById('betaIntroVideoLoading');
        var introVideoHint = document.getElementById('betaIntroVideoHint');
        var introVideoFallback = document.getElementById('betaIntroVideoFallback');
        if (!next) return;

        if (introVideo) {
            // Ensure we only set the actual `src` when the user initiates playback.
            function ensureIntroSrc() {
                try {
                    var ds = introVideo.getAttribute('data-src');
                    if (ds) {
                        introVideo.removeAttribute('data-src');
                        introVideo.src = ds;
                    }
                } catch (e) {}
            }

            if (introVideo.classList.contains('tpl1-video-loom-video')) {
                introVideo.controls = true;
                introVideo.setAttribute('controls', 'controls');
            } else {
            introVideo.playsInline = true;
            introVideo.controls = false;
            introVideo.removeAttribute('controls');
            var isScrubbing = false;
            var controlsReady = false;
            var pendingPlayRequest = false;
            var hasVideoError = false;
            var defaultHintText = introVideoHint ? String(introVideoHint.textContent || '') : '';

            function formatTimeLabel(totalSeconds) {
                var safe = Math.max(0, Number(totalSeconds) || 0);
                if (!safe) return '0:00';
                var floored = Math.floor(safe);
                var minutes = Math.floor(floored / 60);
                var seconds = floored % 60;
                return String(minutes) + ':' + String(seconds).padStart(2, '0');
            }

            function setLoadingState(isLoading) {
                if (introVideoLoading) {
                    introVideoLoading.hidden = !isLoading;
                }
                if (introVideoFrame) {
                    introVideoFrame.classList.toggle('is-buffering', Boolean(isLoading));
                }
            }

            function setControlsEnabled(isEnabled) {
                controlsReady = Boolean(isEnabled) && !hasVideoError;
                if (introVideoSeek) {
                    introVideoSeek.disabled = !controlsReady;
                    introVideoSeek.setAttribute('aria-disabled', String(!controlsReady));
                }
                if (introVideoControlPlayBtn) {
                    introVideoControlPlayBtn.disabled = !controlsReady;
                    introVideoControlPlayBtn.setAttribute('aria-disabled', String(!controlsReady));
                }
                if (introVideoVolumeToggle) {
                    introVideoVolumeToggle.disabled = !controlsReady;
                    introVideoVolumeToggle.setAttribute('aria-disabled', String(!controlsReady));
                }
                if (introVideoVolume) {
                    introVideoVolume.disabled = !controlsReady;
                    introVideoVolume.setAttribute('aria-disabled', String(!controlsReady));
                }
            }

            function syncIntroVolumeButtonUi() {
                if (!introVideoVolumeToggle) return;
                var muted = introVideo.muted || Number(introVideo.volume) <= 0;
                introVideoVolumeToggle.setAttribute('aria-label', muted ? 'Unmute orientation video' : 'Mute orientation video');
                introVideoVolumeToggle.setAttribute('aria-pressed', String(muted));
                introVideoVolumeToggle.innerHTML = muted
                    ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M11 5 6.5 8H3v8h3.5L11 19V5z"></path><path d="M16 9l5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>'
                    : '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M11 5 6.5 8H3v8h3.5L11 19V5z"></path><path d="M15 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path><path d="M17.5 6.5a7 7 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>';
            }

            function setTimelineVisual(playedPercent, bufferedPercent) {
                if (introVideoSeek) {
                    introVideoSeek.style.setProperty('--seek-played', String(Math.max(0, Math.min(100, playedPercent || 0))) + '%');
                }
                if (introVideoBuffer) {
                    introVideoBuffer.style.width = String(Math.max(0, Math.min(100, bufferedPercent || 0))) + '%';
                }
            }

            function updateDurationLabels() {
                var durationValue = Number(introVideo.duration) || 0;
                var durationText = durationValue > 0 ? formatTimeLabel(durationValue) : '--:--';
                if (introVideoCenterDuration) {
                    introVideoCenterDuration.textContent = 'Duration: ' + durationText;
                }
            }

            function updatePlaybackProgress() {
                var duration = Number(introVideo.duration) || 0;
                var currentTime = Number(introVideo.currentTime) || 0;
                if (introVideoCurrentTime) {
                    var durationText = duration > 0 ? formatTimeLabel(duration) : '--:--';
                    introVideoCurrentTime.textContent = formatTimeLabel(currentTime) + ' / ' + durationText;
                }
                if (!duration) {
                    setTimelineVisual(0, 0);
                    return;
                }

                var playedPercent = (currentTime / duration) * 100;
                if (introVideoSeek && !isScrubbing) {
                    introVideoSeek.value = String(playedPercent);
                    introVideoSeek.setAttribute('aria-valuenow', String(Math.round(playedPercent)));
                }

                var bufferedPercent = 0;
                if (introVideo.buffered && introVideo.buffered.length > 0) {
                    try {
                        var bufferedEnd = introVideo.buffered.end(introVideo.buffered.length - 1);
                        bufferedPercent = (bufferedEnd / duration) * 100;
                    } catch (e) {
                        bufferedPercent = 0;
                    }
                }

                setTimelineVisual(playedPercent, bufferedPercent);
            }

            function syncIntroPlayButtonUi() {
                var isPlaying = !introVideo.paused && !introVideo.ended;
                if (introVideoPlayBtn) {
                    introVideoPlayBtn.setAttribute('aria-label', isPlaying ? 'Pause orientation video' : 'Play orientation video');
                    introVideoPlayBtn.innerHTML = getVideoPlayIcon(isPlaying, 30);
                }
                if (introVideoControlPlayBtn) {
                    introVideoControlPlayBtn.setAttribute('aria-label', isPlaying ? 'Pause orientation video' : 'Play orientation video');
                    introVideoControlPlayBtn.setAttribute('aria-pressed', String(isPlaying));
                    introVideoControlPlayBtn.innerHTML = getVideoPlayIcon(isPlaying, 18);
                }
            }

            function requestPlayWithFallback() {
                ensureIntroSrc();
                if (hasVideoError) {
                    hasVideoError = false;
                    if (introVideoFallback) {
                        introVideoFallback.hidden = true;
                    }
                    if (introVideoHint) {
                        introVideoHint.textContent = defaultHintText;
                    }
                }
                if (introVideo.ended) {
                    introVideo.currentTime = 0;
                }
                if (introVideo.readyState < 2) {
                    pendingPlayRequest = true;
                    introVideo.load();
                    setControlsEnabled(false);
                    if (introVideoHint) {
                        introVideoHint.hidden = true;
                    }
                    setLoadingState(true);
                    syncIntroPlayButtonUi();
                    return;
                }
                setLoadingState(true);
                introVideo.muted = false;
                var playPromise = introVideo.play();
                if (!playPromise || typeof playPromise.catch !== 'function') {
                    return;
                }
                playPromise.catch(function () {
                    setLoadingState(false);
                    if (introVideoHint) {
                        introVideoHint.hidden = false;
                    }
                    syncIntroPlayButtonUi();
                });
            }

            function togglePlayPause() {
                if (!introVideo.paused && !introVideo.ended) {
                    introVideo.pause();
                    return;
                }
                requestPlayWithFallback();
            }

            function toggleMute() {
                if (introVideo.muted || Number(introVideo.volume) <= 0) {
                    introVideo.muted = false;
                    if (Number(introVideo.volume) <= 0) {
                        introVideo.volume = 1;
                    }
                } else {
                    introVideo.muted = true;
                }
                syncIntroVolumeButtonUi();
            }

            if (introVideoPlayBtn) {
                introVideoPlayBtn.addEventListener('click', togglePlayPause);
            }

            introVideo.addEventListener('click', function () {
                togglePlayPause();
            });

            if (introVideoControlPlayBtn) {
                introVideoControlPlayBtn.addEventListener('click', togglePlayPause);
            }

            if (introVideoVolumeToggle) {
                introVideoVolumeToggle.addEventListener('click', function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleMute();
                });
            }

            if (introVideoVolume) {
                introVideoVolume.addEventListener('input', function (e) {
                    var volumeValue = Number(e.target.value) || 0;
                    introVideo.volume = Math.max(0, Math.min(1, volumeValue / 100));
                    introVideo.muted = false;
                    introVideoVolume.setAttribute('aria-valuenow', String(volumeValue));
                    syncIntroVolumeButtonUi();
                });
            }

            if (introVideoSeek) {
                introVideoSeek.addEventListener('input', function () {
                    isScrubbing = true;
                    var duration = Number(introVideo.duration) || 0;
                    var percent = Math.max(0, Math.min(100, Number(introVideoSeek.value) || 0));
                    introVideoSeek.setAttribute('aria-valuenow', String(Math.round(percent)));
                    if (duration > 0 && introVideoCurrentTime) {
                        var previewTime = duration * (percent / 100);
                        var durationText = duration > 0 ? formatTimeLabel(duration) : '--:--';
                        introVideoCurrentTime.textContent = formatTimeLabel(previewTime) + ' / ' + durationText;
                    }
                    setTimelineVisual(percent, Number((introVideoBuffer && introVideoBuffer.style.width || '0').replace('%', '')) || 0);
                });

                introVideoSeek.addEventListener('change', function () {
                    var duration = Number(introVideo.duration) || 0;
                    var percent = Math.max(0, Math.min(100, Number(introVideoSeek.value) || 0));
                    if (duration > 0) {
                        introVideo.currentTime = duration * (percent / 100);
                    }
                    isScrubbing = false;
                    updatePlaybackProgress();
                });

                introVideoSeek.addEventListener('pointerup', function () {
                    isScrubbing = false;
                });

                introVideoSeek.addEventListener('touchend', function () {
                    isScrubbing = false;
                });
            }

            introVideo.addEventListener('play', function () {
                if (introVideoFrame) {
                    introVideoFrame.classList.add('is-playing');
                }
                if (introVideoHint) {
                    introVideoHint.hidden = true;
                }
                setLoadingState(false);
                syncIntroPlayButtonUi();
                syncIntroVolumeButtonUi();
            });

            introVideo.addEventListener('pause', function () {
                if (!introVideo.ended && introVideoFrame) {
                    introVideoFrame.classList.remove('is-playing');
                }
                setLoadingState(false);
                syncIntroPlayButtonUi();
                syncIntroVolumeButtonUi();
            });

            introVideo.addEventListener('ended', function () {
                if (introVideoFrame) {
                    introVideoFrame.classList.remove('is-playing');
                }
                setLoadingState(false);
                updatePlaybackProgress();
                syncIntroPlayButtonUi();
                syncIntroVolumeButtonUi();
            });

            introVideo.addEventListener('loadedmetadata', function () {
                setControlsEnabled(true);
                updateDurationLabels();
                updatePlaybackProgress();
            });

            introVideo.addEventListener('timeupdate', updatePlaybackProgress);
            introVideo.addEventListener('progress', updatePlaybackProgress);
            introVideo.addEventListener('seeking', function () {
                setLoadingState(true);
            });
            introVideo.addEventListener('seeked', function () {
                setLoadingState(false);
                updatePlaybackProgress();
            });
            introVideo.addEventListener('waiting', function () {
                if (!introVideo.paused && !introVideo.ended) {
                    setLoadingState(true);
                }
            });
            introVideo.addEventListener('stalled', function () {
                if (!introVideo.paused && !introVideo.ended) {
                    setLoadingState(true);
                }
            });
            introVideo.addEventListener('canplay', function () {
                setControlsEnabled(true);
                setLoadingState(false);
                if (pendingPlayRequest) {
                    pendingPlayRequest = false;
                    requestPlayWithFallback();
                }
            });
            introVideo.addEventListener('playing', function () {
                setLoadingState(false);
                syncIntroVolumeButtonUi();
            });

            introVideo.addEventListener('error', function () {
                hasVideoError = true;
                pendingPlayRequest = false;
                if (introVideoFallback) {
                    introVideoFallback.hidden = false;
                }
                if (introVideoHint) {
                    introVideoHint.textContent = 'Video failed to load. Please check your connection and try again.';
                    introVideoHint.hidden = false;
                }
                setControlsEnabled(false);
                setLoadingState(false);
                syncIntroPlayButtonUi();
                syncIntroVolumeButtonUi();
            });

            setControlsEnabled(false);
            setLoadingState(true);
            updateDurationLabels();
            updatePlaybackProgress();
            syncIntroPlayButtonUi();
            syncIntroVolumeButtonUi();
            }
        }

        if (readyCheck) {
            readyCheck.checked = completed.has(index) || readyCheck.checked;
            next.disabled = !(completed.has(index) || readyCheck.checked);
            readyCheck.addEventListener('change', function () {
                next.disabled = !readyCheck.checked;
            });
        }

        next.addEventListener('click', function () {
            if (readyCheck && !readyCheck.checked) return;
            completeStep(index);
        });
    }

    function wireOverviewStep(index) {
        var next = document.getElementById('betaOverviewNext');
        wireOverviewChallengeTicker();
        if (!next) return;

        next.addEventListener('click', function () {
            completeStep(index);
        });
    }

    function clearOverviewChallengeTicker() {
        if (!overviewChallengeTickerTimer) return;
        window.clearInterval(overviewChallengeTickerTimer);
        overviewChallengeTickerTimer = null;
    }

    function wireOverviewChallengeTicker() {
        clearOverviewChallengeTicker();

        if (!panelEl) return;

        var challengeWrap = panelEl.querySelector('.tpl1-overview-challenge');
        if (!challengeWrap) return;

        var leadEl = challengeWrap.querySelector('.tpl1-overview-challenge-lead');
        var itemEls = Array.prototype.slice.call(challengeWrap.querySelectorAll('.tpl1-overview-challenge-item'));
        if (!leadEl || itemEls.length < 2) return;

        var texts = itemEls
            .map(function (item) { return (item.textContent || '').trim(); })
            .filter(function (text) { return text.length > 0; });

        if (texts.length < 2) return;

        var activeIndex = Math.max(0, texts.indexOf((leadEl.textContent || '').trim()));
        leadEl.textContent = texts[activeIndex];

        overviewChallengeTickerTimer = window.setInterval(function () {
            activeIndex = (activeIndex + 1) % texts.length;
            leadEl.textContent = texts[activeIndex];
        }, 3000);
    }

    function wireResultStep(index) {
        var continueBtn = document.getElementById('betaResultContinue');
        var retakeBtn = document.getElementById('betaQuizRetake');
        var resultCard = document.getElementById('quizResult');

        var quizStep = steps[index];
        var quizState = getQuizState(quizStep);
        var totalQuestions = agentReadinessQuestions.length;
        var selectedAnswers = Array.isArray(quizState.selectedAnswers) ? quizState.selectedAnswers : [];
        var percent = typeof quizState.score === 'number'
            ? quizState.score
            : calculateQuizScore(agentReadinessQuestions, selectedAnswers);
        var correctCount = calculateQuizCorrectCount(agentReadinessQuestions, selectedAnswers);
        var hasResult = totalQuestions > 0 && selectedAnswers.length > 0;
        var statusState = 'qr-fail';
        if (hasResult && percent >= 80) {
            statusState = 'qr-pass';
        } else if (hasResult && percent >= 70) {
            statusState = 'qr-near';
        }

        function formatDuration(seconds) {
            var safe = Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0;
            var mins = Math.floor(safe / 60);
            var secs = safe % 60;
            if (mins <= 0) return safe > 0 ? secs + 's' : '--';
            return mins + 'm ' + String(secs).padStart(2, '0') + 's';
        }

        function resetQuizAndRerender(incrementAttempt) {
            quizState.currentIndex = 0;
            quizState.selectedAnswers = [];
            quizState.completed = false;
            quizState.score = null;
            quizState.finalizing = false;
            quizState.durationSec = 0;
            if (incrementAttempt) {
                quizState.attempts = Math.max(1, Number(quizState.attempts) || 1) + 1;
            }
            quizState.startedAtMs = Date.now();

            completed.delete(index);
            current = index;
            syncOpenGroupForIndex(current);
            writeLocalCompletedKeys();
            renderAll({ animatePanel: true });
        }

        if (resultCard) {
            var scoreEl = resultCard.querySelector('.qr-score');
            var percentEl = resultCard.querySelector('.qr-percent');
            var titleEl = resultCard.querySelector('.qr-title');
            var subEl = resultCard.querySelector('.qr-sub');
            var statValueEls = resultCard.querySelectorAll('.qr-stat .value');

            resultCard.classList.remove('qr-state', 'qr-pass', 'qr-near', 'qr-fail');
            resultCard.classList.add(statusState);
            resultCard.setAttribute('aria-atomic', 'true');

            if (scoreEl) scoreEl.textContent = String(hasResult ? correctCount : 0);
            if (percentEl) percentEl.textContent = String(hasResult ? percent : 0) + '%';

            if (titleEl) {
                titleEl.textContent = statusState === 'qr-pass'
                    ? 'Status: Passed'
                    : statusState === 'qr-near'
                        ? 'Status: Near-pass'
                        : 'Status: Failed';
            }

            if (subEl) {
                subEl.textContent = statusState === 'qr-pass'
                    ? 'Great job. You passed the quiz and can continue to your certificate.'
                    : statusState === 'qr-near'
                        ? 'You are close to passing. Review your answers and try again.'
                        : 'You did not meet the passing score. Please retake the quiz to continue.';
            }

            if (statValueEls[0]) statValueEls[0].textContent = String(hasResult ? correctCount : 0) + ' / ' + String(totalQuestions || 15);
            if (statValueEls[1]) statValueEls[1].textContent = formatDuration(quizState.durationSec);
            if (statValueEls[2]) statValueEls[2].textContent = String(Math.max(1, Number(quizState.attempts) || 1));

        }

        if (continueBtn) {
            continueBtn.addEventListener('click', async function () {
                if (continueBtn.disabled) return;
                await completeStep(index, {
                    skipServerSave: true,
                    showAlertOnError: false
                });
            });
        }

        if (retakeBtn) {
            retakeBtn.addEventListener('click', function () {
                resetQuizAndRerender(true);
            });
        }
    }

    function wireUploadStep(index) {
        var uploadTriggers = Array.from(panelEl.querySelectorAll('[data-upload-trigger]'));
        var fileInputs = uploadTriggers.map(function (trigger) {
            var inputId = trigger.getAttribute('data-upload-trigger');
            return document.getElementById(inputId);
        }).filter(function (input) { return Boolean(input); });
        var mark = document.getElementById('betaMarkDone');
        var docsStatus = document.getElementById('betaAgentDocsStatus');

        if (!mark) return;

        function setDocsStatus(message, isSuccess) {
            if (!docsStatus) return;
            docsStatus.textContent = message || '';
            docsStatus.classList.toggle('show', Boolean(message));
            docsStatus.style.color = isSuccess ? '#1d9f5f' : '#ba2f2f';
        }

        function refreshUploadDisplayForInput(input) {
            var inputId = input.id;
            var state = getUploadStateForInput(inputId, input, getDefaultUploadDescription(inputId));
            setUploadControlDisplay(inputId, state.labelText, state.actionText, state.hasFile);
        }

        function shouldValidateInput(input) {
            if (!input) return false;
            if (!uploadDocIdByInputId[input.id]) return false;
            // Temporary toggle: skip DocValidator detection entirely unless explicitly enabled.
            if (window.ONBOARDING_DOC_DETECTION_ENABLED !== true) return false;
            if (!window.DocValidator || typeof window.DocValidator.validateInput !== 'function') return false;
            return true;
        }

        function isSelectedFileValid(input) {
            if (!input || !input.files || input.files.length === 0) return false;
            if (!shouldValidateInput(input)) return true;

            var state = typeof window.DocValidator.getStateByInputId === 'function'
                ? window.DocValidator.getStateByInputId(input.id)
                : null;

            if (!state) return false;
            if (state.status === 'checking') return false;
            return Boolean(state.valid && state.status === 'valid');
        }

        function updateMarkState() {
            var allUploaded = fileInputs.length > 0 && fileInputs.every(function (input) {
                var inputId = input.id;
                var selected = Boolean(input.files && input.files.length > 0);
                var persisted = Boolean(fileMetaName(getPersistedDocMetaByInputId(inputId)));
                if (selected) {
                    return isSelectedFileValid(input);
                }
                return persisted;
            });
            mark.disabled = !allUploaded;
        }

        uploadTriggers.forEach(function (trigger) {
            var inputId = trigger.getAttribute('data-upload-trigger');
            var input = document.getElementById(inputId);
            if (!input) return;

            trigger.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    input.click();
                }
            });

            input.addEventListener('change', function () {
                refreshUploadDisplayForInput(input);
                setDocsStatus('', false);

                if (!input.files || input.files.length === 0) {
                    if (window.DocValidator && typeof window.DocValidator.clearInputState === 'function') {
                        window.DocValidator.clearInputState(input);
                    }
                    updateMarkState();
                    return;
                }

                if (shouldValidateInput(input)) {
                    window.DocValidator.validateInput(input).finally(function () {
                        updateMarkState();
                    });
                    return;
                }

                updateMarkState();
            });

            refreshUploadDisplayForInput(input);
        });

        updateMarkState();

        mark.addEventListener('click', async function () {
            if (mark.disabled) return;
            setDocsStatus('', false);
            mark.disabled = true;

            var validationPromises = [];
            for (var v = 0; v < fileInputs.length; v += 1) {
                var validateInputRef = fileInputs[v];
                var hasSelectedFile = Boolean(validateInputRef.files && validateInputRef.files.length > 0);
                if (hasSelectedFile && shouldValidateInput(validateInputRef)) {
                    validationPromises.push(window.DocValidator.validateInput(validateInputRef));
                }
            }

            if (validationPromises.length > 0) {
                var validationResults = await Promise.all(validationPromises);
                var hasInvalid = validationResults.some(function (result) {
                    return !result || !result.valid;
                });
                if (hasInvalid) {
                    setDocsStatus('One or more files failed validation. Please review highlighted document rows.', false);
                    updateMarkState();
                    return;
                }
            }

            var formData = new FormData();
            for (var i = 0; i < fileInputs.length; i += 1) {
                var input = fileInputs[i];
                var fieldName = uploadApiFieldByInputId[input.id] || uploadFieldByInputId[input.id];
                if (!fieldName) continue;
                if (input.files && input.files.length > 0) {
                    formData.append(fieldName, input.files[0]);
                }
            }

            try {
                var response = await fetch(onboardingApi.agentDocumentsSaveUrl, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'X-CSRFToken': getCsrfTokenFallback()
                    },
                    body: formData
                });

                var payload = {};
                try {
                    payload = await response.json();
                } catch (jsonError) {
                    payload = {};
                }

                if (!response.ok || !payload.ok) {
                    var docsReason = buildUploadErrorMessage(response, payload, 'Document upload failed.');
                    setDocsStatus('Not saved: ' + docsReason, false);
                    window.alert(docsReason + ' ' + uploadConstraintHint());
                    fileInputs.forEach(refreshUploadDisplayForInput);
                    updateMarkState();
                    return;
                }

                applyOnboardingProfileData(payload.data || {});
                setDocsStatus('Saved to server', true);
                await completeStep(index);
            } catch (error) {
                console.warn('Agent Requirements document upload failed.', error);
                var docsNetworkReason = 'Network error: ' + (error && error.message ? error.message : 'Unable to reach server.');
                setDocsStatus('Not saved: ' + docsNetworkReason, false);
                window.alert(docsNetworkReason);
                fileInputs.forEach(refreshUploadDisplayForInput);
                updateMarkState();
            }
        });
    }

    function wireReviewStep(index) {
        var activate = document.getElementById('betaActivate');
        var consent = document.getElementById('betaConsentCheck');
        var activationMessage = document.getElementById('betaActivationMessage');
        var retryBtnId = 'betaRetryCompletionEmail';
        var statusPollTimer = null;
        var maxStatusPollAttempts = 30;

        function setActivationMessage(message, tone) {
            setActivationStatusMessage(message, tone);
        }

        function getRecipientLabel(payload) {
            var recipient = payload && payload.recipient_email ? String(payload.recipient_email).trim() : '';
            if (!recipient) {
                recipient = String(completionCertificateMeta.recipientEmail || '').trim();
            }
            if (!recipient) {
                recipient = String(currentUserEmail || '').trim();
            }
            return recipient || 'your account email';
        }

        function getBackendLabel(payload) {
            var backend = payload && payload.email_backend ? String(payload.email_backend).trim() : '';
            if (!backend) {
                backend = String(completionCertificateMeta.emailBackend || '').trim();
            }
            return backend;
        }

        function buildFailureDetail(payload) {
            var backend = getBackendLabel(payload);
            var errorText = payload && payload.error ? String(payload.error).trim() : '';
            if (!errorText && payload && payload.last_error) {
                errorText = String(payload.last_error).trim();
            }
            if (!errorText) {
                errorText = String(completionCertificateMeta.lastEmailError || '').trim();
            }

            var detailParts = [];
            if (backend) {
                detailParts.push('backend: ' + backend);
            }
            if (errorText) {
                detailParts.push('error: ' + errorText);
            }
            if (!detailParts.length) {
                return '';
            }
            return ' (' + detailParts.join(' | ') + ')';
        }

        function clearStatusPollTimer() {
            if (statusPollTimer) {
                window.clearTimeout(statusPollTimer);
                statusPollTimer = null;
            }
        }

        function removeRetrySendButton() {
            var existing = document.getElementById(retryBtnId);
            if (existing && existing.parentNode) {
                existing.parentNode.removeChild(existing);
            }
        }

        function showRetrySendButton() {
            if (!activationMessage || document.getElementById(retryBtnId)) return;
            var actionsHost = activationMessage.parentNode;
            if (!actionsHost) return;

            var retryBtn = document.createElement('button');
            retryBtn.type = 'button';
            retryBtn.id = retryBtnId;
            retryBtn.className = 'tpl1-btn';
            retryBtn.textContent = 'Retry Send';
            retryBtn.style.marginTop = '10px';
            retryBtn.addEventListener('click', function () {
                retryBtn.disabled = true;
                setActivationMessage('Retrying confirmation email delivery...', 'info');
                sendCompletionRequest(true);
            });
            actionsHost.appendChild(retryBtn);
        }

        function normalizeEmailStatus(payload) {
            var responseCode = payload && payload.code ? String(payload.code) : '';
            var emailStatus = payload && payload.email_status ? String(payload.email_status) : '';

            if (!emailStatus) {
                if (responseCode === 'ONBOARDING_COMPLETION_ALREADY_SENT') {
                    emailStatus = 'already_sent';
                } else if (responseCode === 'ONBOARDING_COMPLETION_NO_EMAIL') {
                    emailStatus = 'no_email';
                } else if (responseCode === 'ONBOARDING_COMPLETION_EMAIL_PENDING') {
                    emailStatus = 'pending';
                } else if (responseCode === 'ONBOARDING_COMPLETION_EMAIL_SENT') {
                    emailStatus = 'sent';
                } else if (responseCode === 'ONBOARDING_COMPLETION_EMAIL_FAILED') {
                    emailStatus = 'failed';
                }
            }

            if (emailStatus === 'sent_now') {
                return 'sent';
            }
            if (emailStatus === 'delivery_failed') {
                return 'failed';
            }
            return emailStatus;
        }

        function startCompletionStatusPolling() {
            clearStatusPollTimer();
            var attempts = 0;

            async function pollOnce() {
                attempts += 1;
                try {
                    var response = await fetch(onboardingApi.completionEmailStatusUrl, {
                        method: 'GET',
                        credentials: 'same-origin'
                    });

                    var payload = {};
                    try {
                        payload = await response.json();
                    } catch (jsonError) {
                        payload = {};
                    }
                    updateCompletionCertificateMeta(payload);

                    var emailStatus = normalizeEmailStatus(payload);
                    var message = payload && payload.message ? String(payload.message) : '';

                    if (response.ok && payload.ok) {
                        if (emailStatus === 'sent' || emailStatus === 'already_sent') {
                            removeRetrySendButton();
                            setActivationMessage('Confirmation email sent to ' + getRecipientLabel(payload) + '.', 'success');
                            clearStatusPollTimer();
                            return;
                        }

                        if (emailStatus === 'failed') {
                            setActivationMessage((message || 'Confirmation email delivery failed. Please retry sending.') + buildFailureDetail(payload), 'warning');
                            showRetrySendButton();
                            clearStatusPollTimer();
                            return;
                        }

                        if (emailStatus === 'no_email') {
                            removeRetrySendButton();
                            setActivationMessage('Activation complete, but no email is set on your account.', 'warning');
                            clearStatusPollTimer();
                            return;
                        }

                        if (emailStatus === 'pending' && attempts < maxStatusPollAttempts) {
                            setActivationMessage('Activation complete. Confirmation email is being sent to ' + getRecipientLabel(payload) + '.', 'info');
                            statusPollTimer = window.setTimeout(pollOnce, 2000);
                            return;
                        }

                        if (emailStatus === 'pending') {
                            setActivationMessage('Activation complete. Email delivery is taking longer than expected. You can retry send.', 'warning');
                            showRetrySendButton();
                            clearStatusPollTimer();
                            return;
                        }
                    }

                    if (attempts < maxStatusPollAttempts) {
                        statusPollTimer = window.setTimeout(pollOnce, 2000);
                    } else {
                        setActivationMessage('Activation complete. Unable to confirm email delivery right now. You can retry send.', 'warning');
                        showRetrySendButton();
                        clearStatusPollTimer();
                    }
                } catch (error) {
                    if (attempts < maxStatusPollAttempts) {
                        statusPollTimer = window.setTimeout(pollOnce, 2000);
                    } else {
                        setActivationMessage('Activation complete. Unable to confirm email delivery right now. You can retry send.', 'warning');
                        showRetrySendButton();
                        clearStatusPollTimer();
                    }
                }
            }

            pollOnce();
        }

        function syncActivateButtonState() {
            if (!activate) return;

            if (activationCompletedInSession) {
                activate.disabled = true;
                activate.textContent = 'Activated';
                console.debug('[onboarding][activate] state', { disabled: activate.disabled, consentChecked: Boolean(consent && consent.checked), inProgress: activationInProgress, completed: activationCompletedInSession });
                return;
            }

            activate.textContent = activationInProgress ? 'Activating...' : 'Activate Account';
            activate.disabled = activationInProgress || !(consent && consent.checked);
            console.debug('[onboarding][activate] state', { disabled: activate.disabled, consentChecked: Boolean(consent && consent.checked), inProgress: activationInProgress, completed: activationCompletedInSession });
        }

        if (consent && activate) {
            consent.checked = completed.has(index) || consent.checked;
            consent.addEventListener('change', function () {
                if (!activationInProgress && !activationCompletedInSession) {
                    setActivationMessage('', 'info');
                }
                syncActivateButtonState();
            });
        }

        syncActivateButtonState();

        async function sendCompletionRequest(forceResend) {
            var requestTimeoutMs = 12000;
            var requestController = typeof AbortController === 'function' ? new AbortController() : null;
            var requestTimeoutId = null;

            try {
                var completionUrl = onboardingApi.completionUrl;
                if (forceResend) {
                    completionUrl += (completionUrl.indexOf('?') === -1 ? '?' : '&') + 'force_resend=true';
                }

                if (requestController) {
                    requestTimeoutId = window.setTimeout(function () {
                        requestController.abort();
                    }, requestTimeoutMs);
                }

                var response = await fetch(completionUrl, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    signal: requestController ? requestController.signal : undefined
                });

                if (requestTimeoutId) {
                    window.clearTimeout(requestTimeoutId);
                    requestTimeoutId = null;
                }

                var payload = {};
                try {
                    payload = await response.json();
                } catch (jsonError) {
                    payload = {};
                }
                updateCompletionCertificateMeta(payload);

                var message = payload && payload.message ? String(payload.message) : '';
                var emailStatus = normalizeEmailStatus(payload);
                console.debug('[onboarding][complete] response', { status: response.status, ok: Boolean(payload && payload.ok), code: payload && payload.code ? String(payload.code) : '', emailStatus: emailStatus || '' });

                if (response.ok && payload.ok) {
                    if (emailStatus === 'already_sent') {
                        if (!completionCertificateMeta.sentAt) {
                            completionCertificateMeta.sentAt = new Date().toISOString();
                        }
                        removeRetrySendButton();
                        setActivationMessage('Activation complete. Confirmation email was already sent to ' + getRecipientLabel(payload) + '.', 'success');
                        return;
                    }

                    if (emailStatus === 'no_email') {
                        removeRetrySendButton();
                        setActivationMessage('Activation complete, but no email is set on your account.', 'warning');
                        return;
                    }

                    if (emailStatus === 'failed') {
                        setActivationMessage((message || 'Confirmation email delivery failed. Please retry sending.') + buildFailureDetail(payload), 'warning');
                        showRetrySendButton();
                        return;
                    }

                    if (emailStatus === 'pending') {
                        removeRetrySendButton();
                        setActivationMessage('Activation complete. Confirmation email is being sent to ' + getRecipientLabel(payload) + '.', 'info');
                        startCompletionStatusPolling();
                        return;
                    }

                    if (emailStatus === 'sent') {
                        if (!completionCertificateMeta.sentAt) {
                            completionCertificateMeta.sentAt = new Date().toISOString();
                        }
                        removeRetrySendButton();
                        setActivationMessage('Confirmation email sent to ' + getRecipientLabel(payload) + '.', 'success');
                        return;
                    }

                    removeRetrySendButton();
                    setActivationMessage(message || 'Activation complete.', 'success');
                    return;
                }

                setActivationMessage(message || 'Activation complete. Unable to confirm email delivery right now. You can retry send.', 'warning');
                showRetrySendButton();
            } catch (error) {
                console.warn('Activation completion request failed.', error);
                if (requestTimeoutId) {
                    window.clearTimeout(requestTimeoutId);
                    requestTimeoutId = null;
                }

                if (error && error.name === 'AbortError') {
                    setActivationMessage('Activation complete. Email request timed out. You can retry send.', 'warning');
                } else {
                    setActivationMessage('Activation complete. Unable to reach email service right now. You can retry send.', 'warning');
                }
                showRetrySendButton();
            }
        }

        if (!activate) return;
        activate.addEventListener('click', async function () {
            if (activate.disabled || activationInProgress || activationCompletedInSession) return;

            console.debug('[onboarding][activate] click', { consentChecked: Boolean(consent && consent.checked), disabled: activate.disabled });
            activationInProgress = true;
            syncActivateButtonState();
            setActivationMessage('Finalizing activation...', 'info');

            var stepSaved = await completeStep(index, { showAlertOnError: false });
            console.debug('[onboarding][activate] step-complete result', { stepSaved: stepSaved });
            if (!stepSaved) {
                activationInProgress = false;
                syncActivateButtonState();
                setActivationMessage('Activation could not proceed because final onboarding progress was not saved. Please try again.', 'error');
                return;
            }

            // Commit activated UI state immediately after the onboarding step save succeeds.
            activationInProgress = false;
            activationCompletedInSession = true;
            if (!completionCertificateMeta.sentAt) {
                completionCertificateMeta.sentAt = new Date().toISOString();
            }
            syncActivateButtonState();
            removeRetrySendButton();
            setActivationMessage('Activation complete. Confirmation email is being sent to your account.', 'info');
            showCongratsPanel = true;
            syncOpenGroupForIndex(reviewStepIndex());
            renderAll({ animatePanel: true });

            var forceResendParam = new URLSearchParams(window.location.search).get('force_resend');
            var forceResend = String(forceResendParam || '').toLowerCase() === 'true';
            sendCompletionRequest(forceResend);
        });
    }

    function triggerPanelEnterAnimation() {
        if (!panelEl) return;

        panelEl.classList.remove('is-animating');
        void panelEl.offsetWidth;
        panelEl.classList.add('is-animating');

        if (panelAnimationTimer) {
            window.clearTimeout(panelAnimationTimer);
        }

        panelAnimationTimer = window.setTimeout(function () {
            panelEl.classList.remove('is-animating');
            panelAnimationTimer = null;
        }, 320);
    }

    function renderPanel(animatePanel) {
        clearOverviewChallengeTicker();

        if (isCongratsPanelActive()) {
            panelEl.innerHTML = congratulationsMarkup();
            if (animatePanel) triggerPanelEnterAnimation();
            wireCongratulationsPanel();
            return;
        }

        var step = steps[current];

        if (step.type === 'intro') {
            panelEl.innerHTML = introMarkup(step, current);
            if (animatePanel) triggerPanelEnterAnimation();
            wireCommonNavigation(current);
            wireIntroStep(current);
            return;
        }

        if (step.type === 'video') {
            panelEl.innerHTML = (step && step.group === 'VIDEO LOOM')
                ? videoLoomMarkup(step, current)
                : trainingMarkup(step, current);
            if (animatePanel) triggerPanelEnterAnimation();
            wireCommonNavigation(current);
            if (step && step.group === 'VIDEO LOOM') {
                wireVideoLoomStep(current);
            } else {
                wireVideoStep(current);
            }
            return;
        }

        if (step.type === 'overview') {
            panelEl.innerHTML = overviewMarkup(current);
            if (animatePanel) triggerPanelEnterAnimation();
            wireCommonNavigation(current);
            wireOverviewStep(current);
            return;
        }

        if (step.type === 'quiz') {
            var quizState = getQuizState(step);
            panelEl.innerHTML = quizState.completed ? quizResultMarkup(current) : quizContainerMarkup();
            if (animatePanel) triggerPanelEnterAnimation();
            if (quizState.completed) {
                wireCommonNavigation(current);
                wireResultStep(current);
            } else {
                mountQuizStep(current);
            }
            return;
        }

        if (step.type === 'form') {
            panelEl.innerHTML = formMarkup(step, current);
            if (animatePanel) triggerPanelEnterAnimation();
            wireCommonNavigation(current);
            wireFormStep(current);
            return;
        }

        if (step.type === 'upload') {
            panelEl.innerHTML = uploadMarkup(step, current);
            if (animatePanel) triggerPanelEnterAnimation();
            wireCommonNavigation(current);
            wireUploadStep(current);
            return;
        }

        panelEl.innerHTML = reviewMarkup(current);
        if (animatePanel) triggerPanelEnterAnimation();
        wireCommonNavigation(current);
        wireReviewStep(current);
    }

    function renderProgress() {
        var map = groupMap();
        var currentGroup = '';
        if (isCongratsPanelActive()) {
            currentGroup = 'Congratulations';
        } else if (steps[current]) {
            currentGroup = steps[current].group || '';
        }

        var indices = map[currentGroup] || [];
        var doneCount = indices.filter(function (idx) { return completed.has(idx); }).length;
        var totalCount = indices.length || 0;
        var overallRemainingCount = Math.max(0, steps.length - completed.size);
        var percent = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
        if (isCongratsPanelActive()) percent = 100;

        percentEl.textContent = percent + '% complete' + (totalCount ? (' (' + doneCount + ' / ' + totalCount + ')') : '');
        if (stepsLeftBadgeEl) {
            stepsLeftBadgeEl.textContent = formatStepsLeftLabel(isCongratsPanelActive() ? 0 : overallRemainingCount);
        }
        fillEl.style.width = percent + '%';
        trackEl.setAttribute('aria-valuenow', String(percent));

        var headTitleEl = document.querySelector('.tpl1-progress-head strong');
        if (headTitleEl) headTitleEl.textContent = currentGroup || 'Progress';

        currentEl.textContent = isCongratsPanelActive() ? 'Current: Congratulations' : 'Current: ' + (steps[current] ? steps[current].title : '');
        notifyModulesCompletedIfChanged();
    }

    function renderAll(options) {
        options = options || {};
        if (showCongratsPanel && isCongratsLocked()) {
            showCongratsPanel = false;
        }
        if (!isCongratsPanelActive() && isLocked(current)) {
            current = findFirstUnlockedIndex();
        }
        renderSidebar();
        renderPanel(Boolean(options.animatePanel));
        renderProgress();
        writeLocalViewState();
    }

    function setSidebarCollapsed(collapsed) {
        if (!appEl || !sideToggleBtn) return;
        if (isMobileLayout()) {
            appEl.classList.remove('sidebar-collapsed');
            sideToggleBtn.setAttribute('aria-expanded', String(isMobileSheetOpen));
            sideToggleBtn.setAttribute('aria-label', isMobileSheetOpen ? 'Close steps' : 'Open steps');
            setSideProfileExpanded(false);
            syncSidebarProfileTooltips(false);
            if (sideAvatarEl) {
                try {
                    if (collapsed) {
                        sideAvatarEl.innerHTML = userAvatarHtml;
                    } else {
                        sideAvatarEl.innerHTML = originalSideAvatarHtml;
                    }
                } catch (e) {
                    // Non-fatal: keep original markup if something goes wrong
                    sideAvatarEl.innerHTML = originalSideAvatarHtml;
                }
            }
            return;
        }
        try {
            localStorage.setItem(sidebarStateStorageKey, collapsed ? '1' : '0');
        } catch (e) {
            // Ignore storage errors.
        }
        appEl.classList.toggle('sidebar-collapsed', collapsed);
        if (sideAvatarEl) {
            try {
                if (collapsed) {
                    sideAvatarEl.innerHTML = userAvatarHtml;
                } else {
                    sideAvatarEl.innerHTML = originalSideAvatarHtml;
                }
            } catch (e) {
                sideAvatarEl.innerHTML = originalSideAvatarHtml;
                // Non-fatal: keep original markup if something goes wrong
            }
        }
        sideToggleBtn.setAttribute('aria-expanded', String(!collapsed));
        sideToggleBtn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
        if (collapsed) {
            setSideProfileExpanded(false);
        }
        syncSidebarProfileTooltips(collapsed);
    }

    function setSideProfileExpanded(expanded) {
        var isExpanded = Boolean(expanded);
        var buttons = sideProfileActions ? sideProfileActions.querySelectorAll('.tpl1-side-profile-action') : [];

        for (var i = 0; i < buttons.length; i += 1) {
            buttons[i].tabIndex = isExpanded ? 0 : -1;
        }

        if (sideProfileActions) {
            if (isExpanded) {
                sideProfileActions.hidden = false;
                sideProfileActions.classList.remove('is-collapsed');
                sideProfileActions.setAttribute('aria-hidden', 'false');
            } else {
                sideProfileActions.classList.add('is-collapsed');
                sideProfileActions.setAttribute('aria-hidden', 'true');
                window.setTimeout(function () {
                    if (sideProfileActions && sideProfileActions.classList.contains('is-collapsed')) {
                        sideProfileActions.hidden = true;
                    }
                }, 210);
            }
        }
        if (sideProfileEl) {
            sideProfileEl.classList.toggle('open', isExpanded);
        }
        if (sideProfileToggleBtn) {
            sideProfileToggleBtn.setAttribute('aria-expanded', String(isExpanded));
            sideProfileToggleBtn.setAttribute('title', isExpanded ? 'Hide profile actions' : 'Show profile actions');
        }
    }

    function syncSidebarProfileTooltips(collapsed) {
        var shouldShowTitle = Boolean(collapsed);

        if (sideAvatarEl) {
            if (shouldShowTitle) {
                sideAvatarEl.setAttribute('title', currentUserName);
                sideAvatarEl.setAttribute('aria-label', currentUserName);
            } else {
                sideAvatarEl.removeAttribute('title');
                sideAvatarEl.removeAttribute('aria-label');
            }
        }

        var profileActionButtons = [accountSettingsBtn, signOutBtn];
        for (var i = 0; i < profileActionButtons.length; i += 1) {
            var button = profileActionButtons[i];
            if (!button) continue;
            var label = button.getAttribute('aria-label') || button.textContent || '';
            if (shouldShowTitle) {
                button.setAttribute('title', label.trim());
            } else {
                button.removeAttribute('title');
            }
        }

        if (sideProfileToggleBtn) {
            if (shouldShowTitle) {
                sideProfileToggleBtn.setAttribute('title', 'Profile actions for ' + currentUserName);
            } else {
                sideProfileToggleBtn.removeAttribute('title');
            }
        }
    }

    function initShellControls() {
        var activeSettingRow = null;

        initThemePreference();

        function clearAccountFeedback() {
            if (window.tpl1ErrorUtils && typeof window.tpl1ErrorUtils.clearAllFieldErrors === 'function') {
                window.tpl1ErrorUtils.clearAllFieldErrors();
            } else {
                clearInlineError('tpl1AccountPhoneError');
            }
            if (accountAvatarFeedbackTimer) {
                window.clearTimeout(accountAvatarFeedbackTimer);
                accountAvatarFeedbackTimer = null;
            }
            if (accountSaveMessage) {
                accountSaveMessage.classList.remove('show');
                accountSaveMessage.style.color = '';
                accountSaveMessage.textContent = 'Saved.';
            }
        }

        function closeAccountModal() {
            if (!accountModal) return;
            accountModal.hidden = true;
            setSettingRowMode(null, false);
            if (accountSettingsBtn) {
                accountSettingsBtn.focus();
            }
        }

        function setAboutModalOpen(open, origin) {
            if (!aboutModal) return;
            var isOpen = Boolean(open);

            if (aboutModalCloseTimer) {
                window.clearTimeout(aboutModalCloseTimer);
                aboutModalCloseTimer = null;
            }

            if (origin && typeof origin.x === 'number' && typeof origin.y === 'number') {
                aboutModal.style.setProperty('--about-origin-x', Math.round(origin.x) + 'px');
                aboutModal.style.setProperty('--about-origin-y', Math.round(origin.y) + 'px');
            }

            if (isOpen) {
                aboutModal.hidden = false;
                aboutModal.setAttribute('aria-hidden', 'false');
                aboutModal.classList.remove('is-open');
                window.requestAnimationFrame(function () {
                    window.requestAnimationFrame(function () {
                        aboutModal.classList.add('is-open');
                    });
                });
                return;
            }

            aboutModal.classList.remove('is-open');
            aboutModal.setAttribute('aria-hidden', 'true');
            aboutModalCloseTimer = window.setTimeout(function () {
                if (aboutModal && !aboutModal.classList.contains('is-open')) {
                    aboutModal.hidden = true;
                    aboutModal.style.removeProperty('--about-origin-x');
                    aboutModal.style.removeProperty('--about-origin-y');
                }
                aboutModalCloseTimer = null;
            }, 420);
        }

        function openAboutModal(triggerEl, event) {
            if (!aboutModal) return;

            aboutModalTriggerEl = triggerEl || null;

            var origin = null;
            if (event && typeof event.clientX === 'number' && typeof event.clientY === 'number') {
                origin = { x: event.clientX, y: event.clientY };
            } else if (triggerEl && typeof triggerEl.getBoundingClientRect === 'function') {
                var rect = triggerEl.getBoundingClientRect();
                origin = {
                    x: rect.left + (rect.width / 2),
                    y: rect.top + (rect.height / 2)
                };
            }

            setAboutModalOpen(true, origin);

            if (aboutCloseBtn) {
                window.setTimeout(function () {
                    aboutCloseBtn.focus();
                }, 90);
            }
        }

        function closeAboutModal() {
            if (!aboutModal) return;
            setAboutModalOpen(false);
            if (aboutModalTriggerEl && typeof aboutModalTriggerEl.focus === 'function') {
                aboutModalTriggerEl.focus();
            }
            aboutModalTriggerEl = null;
        }

        function bindAboutModalTriggerDelegation() {
            if (aboutCtaDelegatedWired) return;
            aboutCtaDelegatedWired = true;

            document.addEventListener('click', function (event) {
                var target = event.target;
                if (!target || typeof target.closest !== 'function') return;

                var cta = target.closest('.tpl1-overview-about-cta');
                if (!cta) return;

                event.preventDefault();
                cta.classList.remove('is-pressed');
                void cta.offsetWidth;
                cta.classList.add('is-pressed');

                window.setTimeout(function () {
                    cta.classList.remove('is-pressed');
                }, 480);

                openAboutModal(cta, event);
            });
        }

        function openAccountModal() {
            if (!accountModal) return;
            accountModal.hidden = false;
            setSettingRowMode(null, false);
            clearAccountFeedback();
        }

        function setSettingRowMode(row, editing) {
            if (activeSettingRow && activeSettingRow !== row) {
                toggleSettingRow(activeSettingRow, false, false);
            }
            if (!row) {
                activeSettingRow = null;
                return;
            }
            toggleSettingRow(row, editing, editing);
            activeSettingRow = editing ? row : null;
        }

        function toggleSettingRow(row, editing, focusInput) {
            var textButton = row.querySelector('.tpl1-setting-text');
            var valueEl = row.querySelector('.tpl1-setting-value');
            var input = row.querySelector('.tpl1-setting-input');
            var saveButton = row.querySelector('.tpl1-setting-save');
            if (!textButton || !valueEl || !input || !saveButton) return;

            textButton.hidden = editing;
            input.hidden = !editing;
            saveButton.hidden = !editing;

            if (editing) {
                if (input.type === 'date') {
                    var initialDate = input.value || valueEl.getAttribute('data-raw') || '';
                    input.value = initialDate;
                } else {
                    input.value = valueEl.textContent;
                }
                if (focusInput) {
                    input.focus();
                    if (typeof input.select === 'function' && input.type !== 'date') {
                        input.select();
                    }
                }
            }
        }

        function saveSettingRow(row) {
            var textButton = row.querySelector('.tpl1-setting-text');
            var valueEl = row.querySelector('.tpl1-setting-value');
            var input = row.querySelector('.tpl1-setting-input');
            if (!textButton || !valueEl || !input) return;

            var value = (input.value || '').trim();
            if (!value) return;

            if (input.type === 'date') {
                valueEl.textContent = formatDateLabel(value);
                valueEl.setAttribute('data-raw', value);
            } else {
                valueEl.textContent = value;
            }

            // Placeholder: persist single-field updates through an API call when backend wiring is ready.
            // saveAccountSetting(row.getAttribute('data-key'), value);

            setSettingRowMode(row, false);
            textButton.focus();
        }

        function formatDateLabel(dateValue) {
            if (!dateValue) return '';
            var parts = dateValue.split('-');
            if (parts.length !== 3) return dateValue;

            var year = Number(parts[0]);
            var monthIndex = Number(parts[1]) - 1;
            var day = Number(parts[2]);
            var monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];

            if (monthIndex < 0 || monthIndex > 11 || !day || !year) return dateValue;
            return monthNames[monthIndex] + ' ' + day + ', ' + year;
        }

        function wireAccountSettingsFields() {
            if (!settingsGrid) return;

            Array.prototype.forEach.call(settingsGrid.querySelectorAll('.tpl1-setting-row'), function (row) {
                var textButton = row.querySelector('.tpl1-setting-text');
                var input = row.querySelector('.tpl1-setting-input');
                var saveButton = row.querySelector('.tpl1-setting-save');

                if (textButton) {
                    textButton.addEventListener('click', function () {
                        setSettingRowMode(row, true);
                    });
                }

                if (saveButton) {
                    saveButton.addEventListener('click', function () {
                        saveSettingRow(row);
                    });
                }

                if (input) {
                    input.addEventListener('keydown', function (event) {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            saveSettingRow(row);
                        }
                        if (event.key === 'Escape') {
                            event.preventDefault();
                            setSettingRowMode(row, false);
                            if (textButton) {
                                textButton.focus();
                            }
                        }
                    });
                }
            });
        }

        if (themeBtn) {
            themeBtn.addEventListener('click', function () {
                toggleThemePreference();
            });
        }

        if (sideToggleBtn) {
            sideToggleBtn.addEventListener('click', function () {
                if (isMobileLayout()) {
                    setMobileSheetOpen(!isMobileSheetOpen);
                    return;
                }
                setSidebarCollapsed(!appEl.classList.contains('sidebar-collapsed'));
            });
            (function applyInitialSidebarState() {
                var shouldCollapse = false;
                try {
                    shouldCollapse = localStorage.getItem(sidebarStateStorageKey) === '1';
                } catch (e) {
                    shouldCollapse = false;
                }
                setSidebarCollapsed(shouldCollapse);
            })();
        }

        if (mobileBackdrop) {
            mobileBackdrop.addEventListener('click', function () {
                setMobileSheetOpen(false);
            });
        }

        if (typeof mobileLayoutQuery.addEventListener === 'function') {
            mobileLayoutQuery.addEventListener('change', onMobileLayoutChange);
        } else if (typeof mobileLayoutQuery.addListener === 'function') {
            mobileLayoutQuery.addListener(onMobileLayoutChange);
        }

        onMobileLayoutChange();
        bindAboutModalTriggerDelegation();
        initPhoneControls();

        if (sideProfileToggleBtn) {
            sideProfileToggleBtn.addEventListener('click', function () {
                var isExpanded = sideProfileToggleBtn.getAttribute('aria-expanded') === 'true';
                setSideProfileExpanded(!isExpanded);
            });
        }

        if (accountSettingsBtn) {
            accountSettingsBtn.addEventListener('click', function () {
                setSideProfileExpanded(false);
                openAccountModal();
            });
        }

        if (accountForm) {
            accountForm.addEventListener('submit', async function (event) {
                event.preventDefault();
                console.log('[AccountForm] Submit event fired');
                clearAccountFeedback();

                var submitBtn = accountForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                }

                var normalized = normalizeAndValidatePH('tpl1PhoneUnified', 'tpl1AccountPhone');
                console.log('[AccountForm] Phone validation result:', normalized);
                
                if (!normalized.valid) {
                    console.warn('[AccountForm] Phone validation failed:', normalized.message);
                    showInlineError('tpl1AccountPhoneError', normalized.message);
                    if (submitBtn) {
                        submitBtn.disabled = false;
                    }
                    return;
                }

                if (accountPhoneInput) {
                    accountPhoneInput.value = normalized.local;
                }

                var formData = new FormData(accountForm);
                console.log('[AccountForm] FormData keys:', Array.from(formData.keys()));

                try {
                    var action = (accountForm.getAttribute('action') || '/portal-account/update/').trim() || '/portal-account/update/';
                    var method = (accountForm.getAttribute('method') || 'POST').toUpperCase();
                    var csrfToken = getCookie('csrftoken');
                    
                    console.log('[AccountForm] Request config:', { action, method, hasCSRFToken: !!csrfToken });

                    var response = await fetch(action, {
                        method: method,
                        credentials: 'same-origin',
                        headers: {
                            'X-CSRFToken': csrfToken
                        },
                        body: formData
                    });

                    console.log('[AccountForm] Response received:', { status: response.status, ok: response.ok });

                    var result = {};
                    var responseText = await response.text();
                    console.log('[AccountForm] Response body (first 200 chars):', responseText.substring(0, 200));
                    
                    try {
                        result = responseText ? JSON.parse(responseText) : {};
                    } catch (jsonError) {
                        console.warn('[AccountForm] JSON parse error:', jsonError);
                        result = {};
                    }

                    if (!response.ok || (result && result.ok === false)) {
                        console.error('[AccountForm] Save failed:', { ok: result.ok, message: result.message, errors: result.field_errors });
                        
                        if (window.tpl1ErrorUtils && typeof window.tpl1ErrorUtils.handleServerErrors === 'function') {
                            window.tpl1ErrorUtils.handleServerErrors(result);
                        } else {
                            var fallbackMsg = prettyApiError(result, 'Please fix the highlighted fields and try again.');
                            console.log('[AccountForm] Using fallback error message:', fallbackMsg);
                            showInlineError('tpl1AccountPhoneError', fallbackMsg);
                        }
                        return;
                    }

                    console.log('[AccountForm] Save successful, updating form:', result);
                    
                    applyOnboardingProfileData({
                        account: {
                            first_name: result.first_name || (formData.get('first_name') || '').toString().trim(),
                            last_name: result.last_name || (formData.get('last_name') || '').toString().trim(),
                            email: result.email || (formData.get('email') || '').toString().trim(),
                            phone_number: result.phone_number || normalized.local,
                            birthdate: result.birthdate || (formData.get('birthdate') || '').toString().trim(),
                            gender: result.gender || (formData.get('gender') || '').toString().trim(),
                        },
                        residential_address: onboardingProfileData.residential_address,
                        agent_requirement_documents: onboardingProfileData.agent_requirement_documents,
                    }, { refreshPanel: true });

                    clearInlineError('tpl1AccountPhoneError');
                    if (accountSaveMessage) {
                        accountSaveMessage.textContent = 'Saved.';
                        accountSaveMessage.classList.add('show');
                    }
                    closeAccountModal();
                } catch (error) {
                    console.error('[AccountForm] Network error:', error);
                    showInlineError('tpl1AccountPhoneError', 'Network error — please check your connection and try again.');
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                    }
                }
            });
        }

        if (signOutBtn) {
            signOutBtn.addEventListener('click', async function () {
                setSideProfileExpanded(false);

                // Wait for any in-flight progress save to finish before logging out.
                if (_pendingSave) {
                    try { await _pendingSave; } catch (e) { /* already logged in completeStep */ }
                }

                // Invalidate the Django session server-side.
                try {
                    await fetch('/portal-auth/logout/', {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: { 'X-CSRFToken': getCookie('csrftoken') }
                    });
                } catch (e) {
                    console.warn('Django logout request failed:', e);
                }

                // Sign out of Firebase.
                try {
                    const { auth, signOut } = await import('./firebase-init.js');
                    await signOut(auth);
                } catch (e) {
                    console.warn('Firebase sign-out failed:', e);
                }

                window.location.href = '/';
            });
        }

        if (accountBackdrop) {
            accountBackdrop.addEventListener('click', function () {
                closeAccountModal();
            });
        }

        if (accountCloseBtn) {
            accountCloseBtn.addEventListener('click', function () {
                closeAccountModal();
            });
        }

        if (aboutBackdrop) {
            aboutBackdrop.addEventListener('click', function () {
                closeAboutModal();
            });
        }

        if (aboutCloseBtn) {
            aboutCloseBtn.addEventListener('click', function () {
                closeAboutModal();
            });
        }

        if (accountAvatarEditBtn) {
            accountAvatarEditBtn.addEventListener('click', function () {
                if (accountAvatarUploadInFlight) return;
                var uploadInput = getAccountAvatarUploadInput();
                if (!uploadInput) {
                    showAccountAvatarFeedback('Avatar upload is unavailable right now.', 'error', 3000);
                    return;
                }
                uploadInput.click();
            });
        }

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                if (isMobileLayout() && isMobileSheetOpen) {
                    setMobileSheetOpen(false);
                    if (sideToggleBtn) {
                        sideToggleBtn.focus();
                    }
                    return;
                }
                if (videoQuizModal && !videoQuizModal.hidden) {
                    closeVideoQuizModal();
                    return;
                }
                if (aboutModal && !aboutModal.hidden) {
                    closeAboutModal();
                    return;
                }
                if (accountModal && !accountModal.hidden) {
                    closeAccountModal();
                    return;
                }
                if (sideProfileToggleBtn && sideProfileToggleBtn.getAttribute('aria-expanded') === 'true') {
                    setSideProfileExpanded(false);
                    sideProfileToggleBtn.focus();
                }
            }
        });

        if (sideUserNameEl) {
            sideUserNameEl.textContent = currentUserName;
        }

        if (sideProfileEl) {
            sideProfileEl.setAttribute('aria-label', currentUserName + ' profile actions');
        }

        setSideProfileExpanded(false);
        syncSidebarProfileTooltips(appEl ? appEl.classList.contains('sidebar-collapsed') : false);

        wireAccountSettingsFields();
        bindVideoQuizModalInteractions();
    }

    async function init() {
        window.getOnboardingCompletedModulesCount = getCompletedModulesCount;
        window.getOnboardingStageProgressSnapshot = getOnboardingStageProgressSnapshot;
        seedCompletedFromBootstrap();
        seedVideoQuizStatesFromLocal();
        seedStepDurationsFromCache();
        restoreViewStateFromLocal();
        initShellControls();
        renderAll(); // Render immediately with bootstrapped data — no blank flash.
        hydrateTrainingDurationPreview();
        await hydrateOnboardingProfileData();
        await hydrateProgressFromServer(); // Reconcile with server.
        await hydrateCompletionMetaFromServer();
        restoreViewStateFromLocal();
        renderAll(); // Re-render with authoritative server data.
        hydrateTrainingDurationPreview();
    }

    init();
})();
