/**
 * ============================================================================
 * DHARA-RAKSHAK — Community Voice & Language System
 * ============================================================================
 * Multilingual alert system using Web Speech API.
 * 5 Languages: English, Hindi, Tamil, Bengali, Regional (Pahari/Garhwali)
 *
 * Each language has 4 risk levels x 3 message types (alert, guidance, emergency).
 * Total: 5 x 4 x 3 = 60 unique messages.
 *
 * Web Speech API voice mapping:
 *   en → en-IN (Indian English)
 *   hi → hi-IN (Hindi)
 *   ta → ta-IN (Tamil)
 *   bn → bn-IN (Bengali)
 *   regional → hi-IN (Pahari/Garhwali approximated via Hindi voice)
 * ============================================================================
 */

const VoiceSystem = (function () {
    'use strict';

    let currentLang = 'en';
    const synth = window.speechSynthesis;

    // Language metadata
    const LANGUAGES = {
        en: { label: 'English', speechLang: 'en-IN' },
        hi: { label: 'Hindi', speechLang: 'hi-IN' },
        ta: { label: 'Tamil', speechLang: 'ta-IN' },
        bn: { label: 'Bengali', speechLang: 'bn-IN' },
        regional: { label: 'Regional', speechLang: 'hi-IN' }
    };

    // ========================================================================
    // ALERT MESSAGE DATABASE — 5 LANGUAGES x 4 RISK LEVELS x 3 TYPES
    // ========================================================================
    const MESSAGES = {
        critical: {
            en: {
                alert: 'CRITICAL DANGER: This slope has a very high risk of landslide. Evacuate immediately and contact the District Disaster Management Authority.',
                guidance: 'Move to higher, stable ground away from the slope. Do not stay near the hill face during heavy rain. Alert your neighbours.',
                emergency: 'Call the National Disaster Helpline at 1078, or State Emergency Operations Center. Do not attempt to collect belongings. Move to the nearest safe shelter.'
            },
            hi: {
                alert: 'गंभीर खतरा: इस पहाड़ी पर भूस्खलन का बहुत अधिक खतरा है। तुरंत सुरक्षित स्थान पर जाएं और जिला आपदा प्रबंधन प्राधिकरण से संपर्क करें।',
                guidance: 'ढलान से दूर ऊंचे और स्थिर जमीन पर जाएं। भारी बारिश के दौरान पहाड़ के पास न रहें। अपने पड़ोसियों को सूचित करें।',
                emergency: 'राष्ट्रीय आपदा हेल्पलाइन 1078 पर कॉल करें। सामान इकट्ठा करने की कोशिश न करें। निकटतम सुरक्षित आश्रय में जाएं।'
            },
            ta: {
                alert: 'மிக முக்கிய ஆபத்து: இந்த சரிவில் நிலச்சரிவு அபாயம் மிக அதிகம். உடனடியாக வெளியேறி மாவட்ட பேரிடர் மேலாண்மை ஆணையத்தை தொடர்பு கொள்ளுங்கள்.',
                guidance: 'சரிவிலிருந்து விலகி உயரமான, நிலையான நிலத்திற்கு செல்லுங்கள். கனமழையின் போது மலைப்பகுதியில் இருக்க வேண்டாம். உங்கள் அண்டை வீட்டாருக்கு எச்சரிக்கை செய்யுங்கள்.',
                emergency: 'தேசிய பேரிடர் உதவி எண் 1078 அழைக்கவும். பொருட்களை எடுக்க முயற்சிக்காதீர்கள். அருகிலுள்ள பாதுகாப்பான தங்குமிடத்திற்கு செல்லுங்கள்.'
            },
            bn: {
                alert: 'গুরুতর বিপদ: এই ঢালে ভূমিধসের ঝুঁকি অত্যন্ত বেশি। অবিলম্বে নিরাপদ স্থানে যান এবং জেলা দুর্যোগ ব্যবস্থাপনা কর্তৃপক্ষের সাথে যোগাযোগ করুন।',
                guidance: 'ঢাল থেকে দূরে উচু, স্থিতিশীল জমিতে যান। ভারী বৃষ্টির সময় পাহাড়ের কাছে থাকবেন না। আপনার প্রতিবেশীদের সতর্ক করুন।',
                emergency: 'জাতীয় দুর্যোগ হেল্পলাইন 1078-এ কল করুন। জিনিসপত্র সংগ্রহ করার চেষ্টা করবেন না। নিকটতম নিরাপদ আশ্রয়ে যান।'
            },
            regional: {
                alert: 'बोहत खतरा है! इस पहाड़ी पे भूस्खलन हो सकता है। अभी सुरक्षित जगह पे जाओ। जिला आपदा अधिकारी को बताओ।',
                guidance: 'पहाड़ से दूर ऊंची और मजबूत जमीन पे जाओ। बारिश में पहाड़ के करीब मत रहो। आसपास के लोगों को बताओ।',
                emergency: 'आपदा हेल्पलाइन 1078 पे फोन करो। सामान मत उठाओ, पहले जान बचाओ।'
            }
        },
        high: {
            en: {
                alert: 'HIGH RISK WARNING: This area shows high landslide susceptibility. Avoid construction and monitor for signs of movement.',
                guidance: 'Watch for tension cracks, tilting trees, unusual sounds, or water seepage on the slope. Report any changes to the local authorities.',
                emergency: 'If you notice sudden ground movement or hear cracking sounds, move away from the slope immediately. Do not wait for official evacuation orders.'
            },
            hi: {
                alert: 'उच्च जोखिम चेतावनी: इस क्षेत्र में भूस्खलन की अधिक संभावना है। निर्माण से बचें और भूमि के हिलने के संकेतों पर नजर रखें।',
                guidance: 'दरारें, झुके हुए पेड़, असामान्य आवाज, या ढलान पर पानी के रिसाव पर ध्यान दें। किसी भी बदलाव की सूचना स्थानीय अधिकारियों को दें।',
                emergency: 'अगर अचानक जमीन हिलती दिखे या दरारों की आवाज सुनाई दे, तो तुरंत ढलान से दूर हट जाएं।'
            },
            ta: {
                alert: 'அதிக ஆபத்து எச்சரிக்கை: இந்த பகுதியில் நிலச்சரிவு சாத்தியம் அதிகம். கட்டுமானத்தை தவிர்க்கவும், நிலநகர்வு அறிகுறிகளை கண்காணிக்கவும்.',
                guidance: 'விரிசல்கள், சாய்ந்த மரங்கள், அசாதாரண ஒலிகள் அல்லது சரிவில் நீர் கசிவு ஆகியவற்றை கவனியுங்கள். ஏதேனும் மாற்றங்களை உள்ளூர் அதிகாரிகளிடம் தெரிவிக்கவும்.',
                emergency: 'திடீர் நிலநகர்வு அல்லது வெடிப்பு ஒலி கேட்டால், உடனடியாக சரிவிலிருந்து விலகிச் செல்லுங்கள்.'
            },
            bn: {
                alert: 'উচ্চ ঝুঁকি সতর্কতা: এই এলাকায় ভূমিধসের সম্ভাবনা বেশি। নির্মাণ এড়িয়ে চলুন এবং নড়াচড়ার লক্ষণ পর্যবেক্ষণ করুন।',
                guidance: 'ফাটল, হেলে পড়া গাছ, অস্বাভাবিক শব্দ বা ঢালে জল চুইয়ে পড়ার দিকে নজর রাখুন। কোনো পরিবর্তন দেখলে স্থানীয় কর্তৃপক্ষকে জানান।',
                emergency: 'হঠাৎ মাটি নড়াচড়া করলে বা ফাটলের শব্দ শুনলে অবিলম্বে ঢাল থেকে সরে যান।'
            },
            regional: {
                alert: 'ज्यादा खतरा है। इस जगह पे भूस्खलन हो सकता है। कुछ बनाओ मत और ध्यान रखो।',
                guidance: 'दरारें देखो, पेड़ टेढ़े हैं क्या, कोई अजीब आवाज है क्या, पानी रिस रहा है क्या। कुछ भी दिखे तो अधिकारी को बताओ।',
                emergency: 'जमीन हिलती लगे या दरार की आवाज आये तो तुरंत पहाड़ से दूर हटो।'
            }
        },
        medium: {
            en: {
                alert: 'MODERATE RISK: This slope requires monitoring. Drainage improvements and vegetation cover are recommended.',
                guidance: 'Ensure proper drainage around your property. Plant deep-rooted vegetation on exposed slopes. Avoid dumping waste on slopes.',
                emergency: 'During heavy rainfall, stay alert for any changes in slope condition. Have an evacuation plan ready.'
            },
            hi: {
                alert: 'मध्यम जोखिम: इस ढलान की निगरानी जरूरी है। जल निकासी सुधार और वनस्पति आवरण की सिफारिश की जाती है।',
                guidance: 'अपने घर के आसपास उचित जल निकासी सुनिश्चित करें। खुली ढलानों पर गहरी जड़ वाले पौधे लगाएं। ढलानों पर कचरा न फेंकें।',
                emergency: 'भारी बारिश के दौरान सतर्क रहें। निकासी योजना तैयार रखें।'
            },
            ta: {
                alert: 'மிதமான ஆபத்து: இந்த சரிவை கண்காணிக்க வேண்டும். வடிகால் மேம்பாடு மற்றும் தாவர மூடி பரிந்துரைக்கப்படுகிறது.',
                guidance: 'உங்கள் சொத்தின் சுற்றிலும் சரியான வடிகால் இருப்பதை உறுதி செய்யுங்கள். வெளிப்படையான சரிவுகளில் ஆழமான வேர் கொண்ட தாவரங்களை நடுங்கள்.',
                emergency: 'கனமழையின் போது சரிவு நிலையில் ஏதேனும் மாற்றங்கள் உள்ளதா என்று எச்சரிக்கையாக இருங்கள். வெளியேற்ற திட்டம் தயாராக வைத்திருங்கள்.'
            },
            bn: {
                alert: 'মাঝারি ঝুঁকি: এই ঢালের নজরদারি প্রয়োজন। নিকাশী উন্নতি এবং উদ্ভিদ আবরণ সুপারিশ করা হয়।',
                guidance: 'আপনার সম্পত্তির চারপাশে যথাযথ নিকাশী নিশ্চিত করুন। উন্মুক্ত ঢালে গভীর শিকড়যুক্ত গাছপালা লাগান।',
                emergency: 'ভারী বৃষ্টিপাতের সময় ঢালের অবস্থায় কোনো পরিবর্তনের জন্য সতর্ক থাকুন। একটি সরিয়ে নেওয়ার পরিকল্পনা প্রস্তুত রাখুন।'
            },
            regional: {
                alert: 'थोड़ा खतरा है। इस पहाड़ी पे ध्यान रखना जरूरी है। पानी निकासी और पेड़-पौधे लगाओ।',
                guidance: 'घर के आसपास पानी जमा न होने दो। पहाड़ पे पेड़ लगाओ। कचरा मत फेंको।',
                emergency: 'बारिश में ध्यान रखो। भागने का रास्ता पता रखो।'
            }
        },
        low: {
            en: {
                alert: 'LOW RISK: This area currently shows low landslide risk. Continue standard monitoring and maintain vegetation.',
                guidance: 'Maintain existing drainage systems. Preserve tree cover. Conduct annual slope inspection.',
                emergency: 'Even in low risk zones, be aware of unusual changes during extreme weather events.'
            },
            hi: {
                alert: 'कम जोखिम: इस क्षेत्र में वर्तमान में भूस्खलन का कम खतरा है। मानक निगरानी जारी रखें।',
                guidance: 'मौजूदा जल निकासी व्यवस्था बनाए रखें। पेड़-पौधों की रक्षा करें। वार्षिक ढलान निरीक्षण करें।',
                emergency: 'कम जोखिम वाले क्षेत्रों में भी चरम मौसम की घटनाओं के दौरान सतर्क रहें।'
            },
            ta: {
                alert: 'குறைந்த ஆபத்து: இந்த பகுதியில் தற்போது நிலச்சரிவு ஆபத்து குறைவு. நிலையான கண்காணிப்பை தொடரவும்.',
                guidance: 'தற்போதுள்ள வடிகால் அமைப்புகளை பராமரிக்கவும். மர மூடியை பாதுகாக்கவும். ஆண்டு சரிவு ஆய்வு நடத்தவும்.',
                emergency: 'குறைந்த ஆபத்து மண்டலங்களிலும், தீவிர வானிலை நிகழ்வுகளின் போது அசாதாரண மாற்றங்களை கவனியுங்கள்.'
            },
            bn: {
                alert: 'কম ঝুঁকি: এই এলাকায় বর্তমানে ভূমিধসের ঝুঁকি কম। মানসম্মত নজরদারি চালিয়ে যান।',
                guidance: 'বিদ্যমান নিকাশী ব্যবস্থা বজায় রাখুন। গাছের আচ্ছাদন সংরক্ষণ করুন। বার্ষিক ঢাল পরিদর্শন করুন।',
                emergency: 'কম ঝুঁকি অঞ্চলেও চরম আবহাওয়ার সময় অস্বাভাবিক পরিবর্তনের জন্য সচেতন থাকুন।'
            },
            regional: {
                alert: 'कम खतरा है। फिलहाल यहां भूस्खलन का ज्यादा डर नहीं है। ध्यान रखते रहो।',
                guidance: 'पानी निकासी ठीक रखो। पेड़ मत काटो। साल में एक बार पहाड़ी की जांच करो।',
                emergency: 'कम खतरे वाली जगह पे भी बहुत ज्यादा बारिश में सावधान रहो।'
            }
        }
    };

    // ========================================================================
    // SPEECH SYNTHESIS
    // ========================================================================

    function speak(text, lang) {
        if (!synth) return;
        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const langMeta = LANGUAGES[lang] || LANGUAGES.en;
        utterance.lang = langMeta.speechLang;
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to find a matching voice
        const voices = synth.getVoices();
        const targetLang = langMeta.speechLang;
        const voice = voices.find(v => v.lang === targetLang) ||
                      voices.find(v => v.lang.startsWith(targetLang.split('-')[0]));
        if (voice) utterance.voice = voice;

        synth.speak(utterance);
    }

    function stopSpeaking() {
        if (synth) synth.cancel();
    }

    // ========================================================================
    // GET MESSAGES FOR RISK LEVEL
    // ========================================================================

    function getMessages(riskLevel) {
        const level = riskLevel?.toLowerCase() || 'medium';
        if (level === 'critical' || level === 'very high') return MESSAGES.critical;
        if (level === 'high') return MESSAGES.high;
        if (level === 'medium' || level === 'moderate') return MESSAGES.medium;
        return MESSAGES.low;
    }

    function getMessage(riskLevel, lang, type) {
        const msgs = getMessages(riskLevel);
        const langKey = lang || currentLang;
        const typeKey = type || 'alert';
        return msgs?.[langKey]?.[typeKey] || msgs?.en?.[typeKey] || '';
    }

    function setLanguage(lang) {
        currentLang = lang;
    }

    function getLanguage() {
        return currentLang;
    }

    function speakAlert(riskLevel, lang, type) {
        const msg = getMessage(riskLevel, lang, type);
        speak(msg, lang || currentLang);
        return msg;
    }

    /**
     * Render voice panel HTML with 5 language tabs
     */
    function renderVoicePanel(riskLevel) {
        const msgs = getMessages(riskLevel);
        const types = ['alert', 'guidance', 'emergency'];
        const typeLabels = {
            alert: 'Alert',
            guidance: 'Guidance',
            emergency: 'Emergency'
        };

        let html = '<div class="voice-panel">';
        html += '<div class="card-header"><h3>Community Voice Alerts</h3></div>';
        html += '<div class="vp-lang-tabs">';

        for (const [k, v] of Object.entries(LANGUAGES)) {
            html += '<button class="vp-lang-tab ' + (k === currentLang ? 'active' : '') + '" onclick="VoiceSystem.setLanguage(\'' + k + '\'); DharaApp.refreshVoicePanel()">' + v.label + '</button>';
        }
        html += '</div>';

        const langMsgs = msgs[currentLang] || msgs.en;
        for (const type of types) {
            const msg = langMsgs[type] || '';
            html += '<div class="voice-alert-msg">';
            html += '<button class="play-btn" onclick="VoiceSystem.speakAlert(\'' + riskLevel + '\', \'' + currentLang + '\', \'' + type + '\')" title="Play">&#9654;</button>';
            html += '<div>';
            html += '<strong style="font-size:0.78rem;color:#555">' + typeLabels[type] + '</strong>';
            html += '<p style="margin:4px 0 0;font-size:0.88rem">' + msg + '</p>';
            html += '</div></div>';
        }

        html += '<div style="margin-top:16px;padding:12px;background:#F8FAFC;border-radius:6px;font-size:0.78rem;color:#666">';
        html += '<strong>Languages:</strong> English (en-IN), Hindi (hi-IN), Tamil (ta-IN), Bengali (bn-IN), Regional Pahari/Garhwali (hi-IN proxy)<br>';
        html += '<strong>Voice Engine:</strong> Web Speech API (SpeechSynthesis). Voice quality depends on browser and OS support.<br>';
        html += '<strong>Note:</strong> For best Tamil/Bengali voice quality, use Google Chrome on desktop.';
        html += '</div>';

        html += '</div>';
        return html;
    }

    // Load voices (async in Chrome)
    if (synth) {
        synth.onvoiceschanged = function () { synth.getVoices(); };
    }

    return {
        speak,
        stopSpeaking,
        getMessages,
        getMessage,
        setLanguage,
        getLanguage,
        speakAlert,
        renderVoicePanel,
        LANGUAGES
    };
})();
