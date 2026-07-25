module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            'react-native-reanimated/plugin' // این خط برای جلوگیری از بیرون پریدن برنامه کاملاً ضروری است
        ],
    };
};