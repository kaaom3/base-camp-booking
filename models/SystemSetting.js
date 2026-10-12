const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
    date: { 
        type: String, 
        required: true, 
        default: 'default' 
    },
    key: { 
        type: String, 
        required: false, 
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
    note: { type: String, default: '' },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

systemSettingSchema.index({ date: 1 }, { unique: true });

// Helper static function to get or initialize default settings
systemSettingSchema.statics.getSettings = async function() {
    let settings = await this.findOne({ date: 'default' });
    if (!settings) {
        settings = await this.findOne({ key: 'facility_status' });
        if (settings && !settings.date) {
            settings.date = 'default';
            await settings.save();
        } else if (!settings) {
            settings = await this.create({ date: 'default', key: 'facility_status' });
        }
    }
    return settings;
};

// Get settings for a specific date (falling back to 'default')
systemSettingSchema.statics.getSettingsForDate = async function(targetDate) {
    if (!targetDate || targetDate === 'default') {
        return await this.getSettings();
    }
    
    let dateSetting = await this.findOne({ date: targetDate });
    if (dateSetting) {
        return dateSetting;
    }
    
    return await this.getSettings();
};

// Get all upcoming dates that have any closure
systemSettingSchema.statics.getUpcomingClosures = async function(todayStr) {
    const list = await this.find({
        date: { $gte: todayStr, $ne: 'default' }
    }).sort({ date: 1 });
    
    return list.filter(item => {
        const gameClosed = !item.gameRoom.isOpen || !item.gameRoom.ps5 || !item.gameRoom.nintendo;
        const iceClosed = !item.iceBath.isOpen || !item.iceBath.male_bath_1 || !item.iceBath.male_bath_2 || !item.iceBath.female_bath_1 || !item.iceBath.female_bath_2;
        return gameClosed || iceClosed;
    });
};

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
