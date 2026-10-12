const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
    key: { 
        type: String, 
        required: true, 
        unique: true, 
        default: 'facility_status' 
    },
    gameRoom: {
        isOpen: { type: Boolean, default: true },
        ps5: { type: Boolean, default: true },
        nintendo: { type: Boolean, default: true }
    },
    iceBath: {
        isOpen: { type: Boolean, default: true },
        male_bath_1: { type: Boolean, default: true },
        male_bath_2: { type: Boolean, default: true },
        female_bath_1: { type: Boolean, default: true },
        female_bath_2: { type: Boolean, default: true }
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Helper static function to get or initialize settings
systemSettingSchema.statics.getSettings = async function() {
    let settings = await this.findOne({ key: 'facility_status' });
    if (!settings) {
        settings = await this.create({ key: 'facility_status' });
    }
    return settings;
};

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
