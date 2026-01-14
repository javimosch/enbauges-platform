if(!globalThis?.saasbackend?.models?.GlobalSetting){
    console.error('Error: saasbackend models not found');
    process.exit(1)
}

const GlobalSetting = globalThis.saasbackend.models.GlobalSetting;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const isValidEmail = (email) => {
  if (!email) return false;
  // pragmatic email check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

exports.subscribe = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Email invalide' });
    }

    const key = 'newsletter_list';

    const setting = await GlobalSetting.findOne({ key });

    let list = [];
    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed)) list = parsed;
      } catch (e) {
        // if corrupted, reset to empty list
        list = [];
      }
    }

    if (!list.includes(email)) {
      list.push(email);
    }

    const value = JSON.stringify(list);

    if (!setting) {
      await GlobalSetting.create({
        key,
        value,
        type: 'json',
        description: 'Newsletter subscriber emails (ref-enbauges)',
        templateVariables: [],
        public: false,
      });
    } else {
      setting.type = 'json';
      setting.value = value;
      await setting.save();
    }

    return res.json({ ok: true, count: list.length });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
