/**
 * ============================================================================
 * DHARARAKSHAK — Community Voice & Language System
 * ============================================================================
 * Multilingual alert system using Web Speech API.
 * Languages: English, Hindi, Regional (Pahari/Garhwali approximate).
 * ============================================================================
 */

const VoiceSystem = (function () {
    'use strict';

    let currentLang = 'en';
    const synth = window.speechSynthesis;

    // ========================================================================
    // ALERT MESSAGE DATABASE
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
        utterance.lang = lang === 'hi' || lang === 'regional' ? 'hi-IN' : 'en-IN';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to find a good voice
        const voices = synth.getVoices();
        const targetLang = utterance.lang;
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
     * Render voice panel HTML
     */
    function renderVoicePanel(riskLevel) {
        const msgs = getMessages(riskLevel);
        const langLabels = { en: 'English', hi: 'हिंदी', regional: 'क्षेत्रीय' };
        const types = ['alert', 'guidance', 'emergency'];
        const typeLabels = { alert: '⚠️ Alert', guidance: '📋 Guidance', emergency: '🚨 Emergency' };

        let html = '<div class="voice-panel">';
        html += '<div class="card-header"><h3>🔊 Community Voice Alerts</h3></div>';
        html += '<div class="vp-lang-tabs">';

        for (const [k, v] of Object.entries(langLabels)) {
            html += `<button class="vp-lang-tab ${k === currentLang ? 'active' : ''}" onclick="VoiceSystem.setLanguage('${k}'); DharaApp.refreshVoicePanel()">${v}</button>`;
        }
        html += '</div>';

        const langMsgs = msgs[currentLang] || msgs.en;
        for (const type of types) {
            const msg = langMsgs[type] || '';
            html += `<div class="voice-alert-msg">
                <button class="play-btn" onclick="VoiceSystem.speakAlert('${riskLevel}', '${currentLang}', '${type}')" title="Play">▶</button>
                <div>
                    <strong style="font-size:0.78rem;color:#555">${typeLabels[type]}</strong>
                    <p style="margin:4px 0 0;font-size:0.88rem">${msg}</p>
                </div>
            </div>`;
        }

        html += '<div style="margin-top:12px;font-size:0.72rem;color:#888">Powered by Web Speech API. Voice quality depends on browser support.</div>';
        html += '</div>';
        return html;
    }

    // Load voices (async in Chrome)
    if (synth) {
        synth.onvoiceschanged = () => synth.getVoices();
    }

    return {
        speak,
        stopSpeaking,
        getMessages,
        getMessage,
        setLanguage,
        getLanguage,
        speakAlert,
        renderVoicePanel
    };
})();
