const FALLBACK_ROOT = "";
const I18N = {
  ru: {
    langName: "Русский",
    appName: "Falon",
    accessKey: "Ключ доступа",
    uploadWallpaper: "Загрузить обои",
    exit: "Выйти",
    buyKey: "Купить ключ",
    freeKey: "Бесплатный ключ",
    freeKeyLead: "Получай бесплатный ключ на 1 день раз в 3 дня.",
    freeKeyOneTime: "Привязано к этому компьютеру",
    freeKeyNote: "Кулдаун хранится в системном хранилище Windows, так что переустановка лаунчера его не сбросит.",
    openCreatorXbox: "Связаться с поддержкой: @molygench",
    generateFreeTrial: "Сгенерировать 1-дневный ключ",
    understood: "Понятно",
    creatorLiveTitle: "Создатель лаунчера стримит Minecraft",
    creatorLiveSub: "Присоединяйся!",
    openTikTok: "Открыть TikTok",
    ready: "Готов",
    wallpaper: "Обои",
    windowColor: "Цвет окон",
    windowColorLead: "Выбери цвет перелива для окон лаунчера.",
    windowColorPrimary: "Основной",
    windowColorSecondary: "Второй",
    windowColorGradient: "Градиент",
    windowColorReset: "Сброс",
    refresh: "Обновить",
    settingsTitle: "Настройки",
    settingsPanelTitle: "Быстрый доступ",
    language: "Язык",
    languageSub: "Интерфейс лаунчера",
    wallpaperSub: "Поменять фон",
    uiShape: "Форма окна",
    uiShapeSub: "Округлённая или квадратная",
    blur: "Прозрачность",
    blurSub: "Blur / clean glass mode",
    buySub: "Выбери способ оплаты и срок — всё покажем сразу и без путаницы.",
    buyFiat: "Обычная валюта",
    buyStars: "Telegram Stars",
    buyCoins: "TikTok Coins",
    refreshSub: "Пересканировать версии",
    exitSub: "Закрыть сессию",
    blurOn: "Блюр: Вкл",
    blurOff: "Блюр: Выкл",
    upload: "Загрузка",
    myResources: "Мои ресурсы",
    worlds: "Миры",
    users: "Пользователи",
    path: "Путь",
    uploadSub: "Ресурсы, аддоны и миры.",
    dropFile: "Перетащи файл",
    noFile: "Файл не выбран",
    file: "Файл",
    profiles: "Профили",
    all: "Все",
    clear: "Снять",
    install: "Установить",
    resourcesSub: "RP/BP по выбранной версии / User.",
    worldsSub: "Миры выбранной версии / User.",
    uploadToUser: "Загрузить в User",
    status: "Статус",
    profileCount: "Профилей",
    key: "Ключ",
    log: "Лог",
    chooseCurrency: "Выберите валюту",
    buy: "Купить",
    pricePrefix: "Стоимость ключа",
    payNote: "Перед оплатой укажите свой Telegram или почту, куда будет выслан код доступа. Время ожидания: 5–10 минут.",
    wrongKey: "Неверный или просроченный ключ",
    keyExpired: "Срок действия ключа истёк",
    keyDeviceMismatch: "Ключ уже привязан к другому компьютеру",
    keyActivationError: "Не удалось проверить ключ",
    keyTimeLeft: "До деактивации",
    profilesFound: "Профилей найдено",
    scanError: "Ошибка сканирования",
    chooseFileFirst: "Сначала выбери файл",
    dropUnsupported: "Перетащи .mcpack, .mcaddon, .mcworld или .zip",
    dropPathError: "Не удалось прочитать путь файла — выбери его кнопкой «Файл»",
    noUserSelected: "Не выбран ни один User",
    installing: "Установка...",
    installedWorld: "Мир",
    installedTo: "установлен в",
    oldRemoved: "удалено старых",
    installedPack: "Пак",
    installError: "Ошибка установки",
    userNotSelected: "User не выбран",
    resourcesNotFound: "Ресурсы не найдены",
    worldsNotFound: "Миры не найдены",
    openFolder: "Папка",
    delete: "Удалить",
    deleteResourceConfirm: "Удалить ресурс и убрать его из миров?",
    deleteWorldConfirm: "Удалить мир?",
    deleted: "Удалено",
    worldDeleted: "Мир удалён",
    deleteError: "Ошибка удаления",
    worldDeleteError: "Ошибка удаления мира",
    resourcesError: "Ошибка ресурсов",
    worldsError: "Ошибка миров",
    wallpaperUpdated: "Обои обновлены",
    wallpaperError: "Ошибка обоев",
    videoPlaybackError: "Видео выбрано, но не воспроизвелось. Лучше MP4 или WEBM.",
    imageLoadError: "Картинка не загрузилась.",
    iconUpdated: "Иконка обновлена",
    iconError: "Ошибка иконки",
    iconLoadError: "Иконка не загрузилась",
    checkoutConfirm: "Перед оплатой укажите свой Telegram или почту, куда будет выслан код доступа.\n\nВремя ожидания: 5–10 минут.\n\nПерейти к оплате?",
    network: "Сеть",
    networkSub: "CurseForge для Bedrock.",
    networkSearchPlaceholder: "Поиск Bedrock-контента",
    networkAllTypes: "Все типы",
    networkSortDownloads: "По загрузкам",
    networkSortUpdated: "Свежие",
    networkSortFeatured: "Рекомендуемые",
    networkSortName: "По названию",
    networkSearchBtn: "Найти",
    networkInstallProfiles: "Профили установки",
    networkIntro: "Поиск аддонов, карт, текстур и скриптов Bedrock.",
    networkLoading: "Загружаю CurseForge...",
    networkClassLoadError: "Не удалось загрузить типы CurseForge",
    networkSearchError: "Ошибка поиска CurseForge",
    networkNoResults: "Ничего не найдено",
    networkInstall: "Установить",
    networkDownload: "Скачать",
    networkOpen: "На CurseForge",
    networkInstallUnsupported: "Файл найден, но формат установки не поддержан",
    networkDownloading: "Скачиваю из CurseForge...",
    networkInstalling: "Устанавливаю из CurseForge...",
    networkInstalled: "CurseForge установил",
    networkDownloaded: "Файл скачан",
    networkDownloadCancelled: "Скачивание отменено",
    networkPage: "Страница",
    networkDownloads: "загрузок",
    networkApiKey: "CurseForge API key",
    networkApiKeyPlaceholder: "Вставь ключ CurseForge API",
    networkSaveApiKey: "Сохранить",
    networkKeyReady: "Ключ сохранён",
    networkKeyRequired: "Для поиска нужен CurseForge API key — вставь его здесь и сохрани.",
    networkKeySaveError: "Не удалось сохранить CurseForge API key",
    networkShowing: "Показано",
    networkScrollMore: "листай вниз — подгружу ещё 50",
    networkAllLoaded: "всё загружено",
    networkLoadingMore: "Загружаю ещё 50 ресурсов...",
    networkDetails: "Подробнее",
    networkKeyBundled: "Встроенный ключ найден",
    game: "Игра",
    gameSub: "Версии, установка и запуск.",
    gameSearchPlaceholder: "Поиск версии, например 1.21.120",
    gameAllTypes: "Все",
    gameRelease: "Release",
    gamePreview: "Preview",
    gameLegacy: "Legacy UWP",
    gameRefresh: "Обновить версии",
    gameVersionsFolder: "Папка версий",
    gameInstallersFolder: "Пакеты",
    gameReady: "Каталог версий ещё не загружен.",
    gameLoadingCatalog: "Загружаю каталог версий...",
    gameCatalogError: "Ошибка каталога версий",
    gameAvailableVersions: "Доступные версии",
    gameInstalledVersions: "Установленные",
    gameInstallVersion: "Скачать и установить",
    gameLaunch: "Запустить",
    gameDelete: "Удалить",
    gameDeleteConfirm: "Удалить эту установленную версию из Falon?",
    gameDeleteDone: "Версия удалена",
    gameDeleteError: "Ошибка удаления версии",
    gameVersionSource: "Источник",
    gameInstallStarted: "Начинаю установку версии",
    gameInstallDone: "Версия установлена",
    gameInstallError: "Ошибка установки версии",
    gameLaunchError: "Ошибка запуска версии",
    gameNoVersions: "Версии не найдены",
    gameNoInstalled: "Установленных версий пока нет",
    gameDownloaded: "скачано",
    gameInstalling: "Установка...",
    active: "ACTIVE"
  },
  en: {
    langName: "English",
    appName: "Falon",
    accessKey: "Access key",
    uploadWallpaper: "Upload wallpaper",
    exit: "Exit",
    buyKey: "Buy key",
    freeKey: "Free key",
    freeKeyLead: "To receive a free 3-day key, star our GitHub repository.",
    freeKeyOneTime: "Free 3-day access",
    freeKeyNote: "After starring the repository, contact support at @molygench and provide proof plus your GitHub ID.",
    openCreatorXbox: "Contact support: @molygench",
    generateFreeTrial: "Generate 1-day key",
    understood: "Got it",
    creatorLiveTitle: "The launcher creator is streaming Minecraft",
    creatorLiveSub: "Join the stream!",
    openTikTok: "Open TikTok",
    ready: "Ready",
    wallpaper: "Wallpaper",
    windowColor: "Window color",
    windowColorLead: "Choose the glow color for launcher windows.",
    windowColorPrimary: "Primary",
    windowColorSecondary: "Secondary",
    windowColorGradient: "Gradient glow",
    windowColorReset: "Reset",
    refresh: "Refresh",
    settingsTitle: "Settings",
    settingsPanelTitle: "Quick access",
    language: "Language",
    languageSub: "Launcher interface",
    wallpaperSub: "Change background",
    uiShape: "Window shape",
    uiShapeSub: "Rounded or square",
    blur: "Transparency",
    blurSub: "Blur / clean glass mode",
    buySub: "Choose a payment method and term — we show everything clearly.",
    buyFiat: "Regular currency",
    buyStars: "Telegram Stars",
    buyCoins: "TikTok Coins",
    refreshSub: "Rescan versions",
    exitSub: "Close session",
    blurOn: "Blur: On",
    blurOff: "Blur: Off",
    upload: "Upload",
    myResources: "My resources",
    worlds: "Worlds",
    users: "Users",
    path: "Path",
    uploadSub: "Resources, add-ons and worlds.",
    dropFile: "Drop file here",
    noFile: "No file selected",
    file: "File",
    profiles: "Profiles",
    all: "All",
    clear: "Clear",
    install: "Install",
    resourcesSub: "RP/BP for the selected version / User.",
    worldsSub: "Worlds for the selected version / User.",
    uploadToUser: "Upload to User",
    status: "Status",
    profileCount: "Profiles",
    key: "Key",
    log: "Log",
    chooseCurrency: "Choose currency",
    buy: "Buy",
    pricePrefix: "Key price",
    payNote: "Before payment, enter your Telegram or email where the access code will be sent. Waiting time: 5–10 minutes.",
    wrongKey: "Invalid or expired key",
    keyExpired: "The access key has expired",
    keyDeviceMismatch: "This key is already bound to another computer",
    keyActivationError: "Could not validate the key",
    keyTimeLeft: "Time left",
    profilesFound: "Profiles found",
    scanError: "Scan error",
    chooseFileFirst: "Select a file first",
    dropUnsupported: "Drop a .mcpack, .mcaddon, .mcworld or .zip file",
    dropPathError: "Could not read the file path — use the File button",
    noUserSelected: "No User selected",
    installing: "Installing...",
    installedWorld: "World",
    installedTo: "installed to",
    oldRemoved: "old removed",
    installedPack: "Pack",
    installError: "Install error",
    userNotSelected: "User is not selected",
    resourcesNotFound: "No resources found",
    worldsNotFound: "No worlds found",
    openFolder: "Folder",
    delete: "Delete",
    deleteResourceConfirm: "Delete this resource and remove it from worlds?",
    deleteWorldConfirm: "Delete this world?",
    deleted: "Deleted",
    worldDeleted: "World deleted",
    deleteError: "Delete error",
    worldDeleteError: "World delete error",
    resourcesError: "Resources error",
    worldsError: "Worlds error",
    wallpaperUpdated: "Wallpaper updated",
    wallpaperError: "Wallpaper error",
    videoPlaybackError: "Video selected, but it could not be played. MP4 or WEBM is better.",
    imageLoadError: "Image failed to load.",
    iconUpdated: "Icon updated",
    iconError: "Icon error",
    iconLoadError: "Icon failed to load",
    checkoutConfirm: "Before payment, enter your Telegram or email where the access code will be sent.\n\nWaiting time: 5–10 minutes.\n\nOpen checkout?",
    network: "Network",
    networkSub: "CurseForge for Bedrock.",
    networkSearchPlaceholder: "Search Bedrock content",
    networkAllTypes: "All types",
    networkSortDownloads: "Top downloads",
    networkSortUpdated: "Latest updated",
    networkSortFeatured: "Featured",
    networkSortName: "By name",
    networkSearchBtn: "Search",
    networkInstallProfiles: "Install profiles",
    networkIntro: "Search Bedrock add-ons, maps, textures and scripts.",
    networkLoading: "Loading CurseForge...",
    networkClassLoadError: "Could not load CurseForge content types",
    networkSearchError: "CurseForge search error",
    networkNoResults: "Nothing found",
    networkInstall: "Install",
    networkDownload: "Download",
    networkOpen: "CurseForge",
    networkInstallUnsupported: "The file exists, but its format is not supported for installation",
    networkDownloading: "Downloading from CurseForge...",
    networkInstalling: "Installing from CurseForge...",
    networkInstalled: "CurseForge installed",
    networkDownloaded: "File downloaded",
    networkDownloadCancelled: "Download cancelled",
    networkPage: "Page",
    networkDownloads: "downloads",
    networkApiKey: "CurseForge API key",
    networkApiKeyPlaceholder: "Paste CurseForge API key",
    networkSaveApiKey: "Save",
    networkKeyReady: "Key saved",
    networkKeyRequired: "Search needs a CurseForge API key — paste and save it here.",
    networkKeySaveError: "Could not save CurseForge API key",
    networkShowing: "Showing",
    networkScrollMore: "scroll down — 50 more will load",
    networkAllLoaded: "all loaded",
    networkLoadingMore: "Loading 50 more resources...",
    networkDetails: "Details",
    networkKeyBundled: "Bundled key detected",
    game: "Game",
    gameSub: "Versions, installation and launch.",
    gameSearchPlaceholder: "Search version, e.g. 1.21.120",
    gameAllTypes: "All",
    gameRelease: "Release",
    gamePreview: "Preview",
    gameLegacy: "Legacy UWP",
    gameRefresh: "Refresh versions",
    gameVersionsFolder: "Versions folder",
    gameInstallersFolder: "Packages",
    gameReady: "Version catalog has not been loaded yet.",
    gameLoadingCatalog: "Loading version catalog...",
    gameCatalogError: "Version catalog error",
    gameAvailableVersions: "Available versions",
    gameInstalledVersions: "Installed",
    gameInstallVersion: "Download & install",
    gameLaunch: "Launch",
    gameDelete: "Delete",
    gameDeleteConfirm: "Delete this installed version from Falon?",
    gameDeleteDone: "Version deleted",
    gameDeleteError: "Version delete error",
    gameVersionSource: "Source",
    gameInstallStarted: "Starting version installation",
    gameInstallDone: "Version installed",
    gameInstallError: "Version install error",
    gameLaunchError: "Version launch error",
    gameNoVersions: "No versions found",
    gameNoInstalled: "No installed versions yet",
    gameDownloaded: "downloaded",
    gameInstalling: "Installing...",
    active: "ACTIVE"
  },
  kk: {
    langName: "Қазақша",
    appName: "Falon",
    accessKey: "Қол жеткізу кілті",
    uploadWallpaper: "Түсқағаз жүктеу",
    exit: "Шығу",
    buyKey: "Кілт сатып алу",
    freeKey: "Free key",
    freeKeyLead: "To receive a free 3-day key, star our GitHub repository.",
    freeKeyOneTime: "Free 3-day access",
    freeKeyNote: "After starring the repository, contact support at @molygench and provide proof plus your GitHub ID.",
    openCreatorXbox: "Contact support: @molygench",
    generateFreeTrial: "1 күндік кілт жасау",
    understood: "Түсіндім",
    creatorLiveTitle: "Лаунчер жасаушысы Minecraft стримін бастады",
    creatorLiveSub: "Қосылыңыз!",
    openTikTok: "TikTok ашу",
    ready: "Дайын",
    wallpaper: "Түсқағаз",
    windowColor: "Терезе түсі",
    windowColorLead: "Лаунчер терезелерінің жарқырау түсін таңда.",
    windowColorPrimary: "Негізгі",
    windowColorSecondary: "Екінші",
    windowColorGradient: "Градиент",
    windowColorReset: "Қалпына келтіру",
    refresh: "Жаңарту",
    blurOn: "Блюр: Қос",
    blurOff: "Блюр: Сөн",
    upload: "Жүктеу",
    myResources: "Менің ресурстарым",
    worlds: "Әлемдер",
    users: "Пайдаланушылар",
    path: "Жол",
    uploadSub: "Ресурстар, аддондар және әлемдер.",
    dropFile: "Файлды осында таста",
    noFile: "Файл таңдалмаған",
    file: "Файл",
    profiles: "Профильдер",
    all: "Барлығы",
    clear: "Тазалау",
    install: "Орнату",
    resourcesSub: "Таңдалған нұсқа / User үшін RP/BP.",
    worldsSub: "Таңдалған нұсқа / User әлемдері.",
    uploadToUser: "User ішіне жүктеу",
    status: "Күй",
    profileCount: "Профильдер",
    key: "Кілт",
    log: "Журнал",
    chooseCurrency: "Валютаны таңдаңыз",
    buy: "Сатып алу",
    pricePrefix: "Кілт бағасы",
    payNote: "Төлем алдында access code жіберілетін Telegram немесе email көрсетіңіз. Күту уақыты: 5–10 минут.",
    wrongKey: "Кілт қате немесе мерзімі өткен",
    keyExpired: "Кілттің мерзімі аяқталды",
    keyDeviceMismatch: "Бұл кілт басқа компьютерге байланған",
    keyActivationError: "Кілтті тексеру мүмкін болмады",
    keyTimeLeft: "Өшіруге дейін",
    profilesFound: "Профильдер табылды",
    scanError: "Сканерлеу қатесі",
    chooseFileFirst: "Алдымен файл таңдаңыз",
    dropUnsupported: ".mcpack, .mcaddon, .mcworld немесе .zip файлын тастаңыз",
    dropPathError: "Файл жолын оқу мүмкін болмады — «Файл» батырмасын қолданыңыз",
    noUserSelected: "User таңдалмаған",
    installing: "Орнатылуда...",
    installedWorld: "Әлем",
    installedTo: "орнатылды",
    oldRemoved: "ескісі жойылды",
    installedPack: "Пак",
    installError: "Орнату қатесі",
    userNotSelected: "User таңдалмаған",
    resourcesNotFound: "Ресурстар табылмады",
    worldsNotFound: "Әлемдер табылмады",
    openFolder: "Папка",
    delete: "Жою",
    deleteResourceConfirm: "Ресурсты жойып, оны әлемдерден алып тастау керек пе?",
    deleteWorldConfirm: "Бұл әлемді жою керек пе?",
    deleted: "Жойылды",
    worldDeleted: "Әлем жойылды",
    deleteError: "Жою қатесі",
    worldDeleteError: "Әлемді жою қатесі",
    resourcesError: "Ресурстар қатесі",
    worldsError: "Әлемдер қатесі",
    wallpaperUpdated: "Түсқағаз жаңартылды",
    wallpaperError: "Түсқағаз қатесі",
    videoPlaybackError: "Видео таңдалды, бірақ ойнатылмады. MP4 немесе WEBM жақсы.",
    imageLoadError: "Сурет жүктелмеді.",
    iconUpdated: "Иконка жаңартылды",
    iconError: "Иконка қатесі",
    iconLoadError: "Иконка жүктелмеді",
    checkoutConfirm: "Төлем алдында access code жіберілетін Telegram немесе email көрсетіңіз.\n\nКүту уақыты: 5–10 минут.\n\nТөлем бетіне өту керек пе?",
    network: "Желі",
    networkSub: "Bedrock үшін CurseForge.",
    networkSearchPlaceholder: "Bedrock контентін іздеу",
    networkAllTypes: "Барлық түрі",
    networkSortDownloads: "Жүктеулер бойынша",
    networkSortUpdated: "Жаңалары",
    networkSortFeatured: "Ұсынылған",
    networkSortName: "Атауы бойынша",
    networkSearchBtn: "Іздеу",
    networkInstallProfiles: "Орнату профильдері",
    networkIntro: "Bedrock аддондары, карталары, текстуралары мен скрипттерін іздеу.",
    networkLoading: "CurseForge жүктелуде...",
    networkClassLoadError: "CurseForge түрлерін жүктеу мүмкін болмады",
    networkSearchError: "CurseForge іздеу қатесі",
    networkNoResults: "Ештеңе табылмады",
    networkInstall: "Орнату",
    networkDownload: "Жүктеу",
    networkOpen: "CurseForge",
    networkInstallUnsupported: "Файл бар, бірақ орнату форматы қолдау таппады",
    networkDownloading: "CurseForge-тан жүктелуде...",
    networkInstalling: "CurseForge-тан орнатылуда...",
    networkInstalled: "CurseForge орнатты",
    networkDownloaded: "Файл жүктелді",
    networkDownloadCancelled: "Жүктеу тоқтатылды",
    networkPage: "Бет",
    networkDownloads: "жүктеу",
    networkApiKey: "CurseForge API key",
    networkApiKeyPlaceholder: "CurseForge API key енгіз",
    networkSaveApiKey: "Сақтау",
    networkKeyReady: "Кілт сақталды",
    networkKeyRequired: "Іздеу үшін CurseForge API key керек — енгізіп сақта.",
    networkKeySaveError: "CurseForge API key сақталмады",
    networkKeyBundled: "Ішкі кілт табылды",
    game: "Ойын",
    gameSub: "Нұсқалар, орнату және іске қосу.",
    gameSearchPlaceholder: "Нұсқаны іздеу, мысалы 1.21.120",
    gameAllTypes: "Барлығы",
    gameRelease: "Release",
    gamePreview: "Preview",
    gameLegacy: "Legacy UWP",
    gameRefresh: "Нұсқаларды жаңарту",
    gameVersionsFolder: "Нұсқалар қалтасы",
    gameInstallersFolder: "Пакеттер",
    gameReady: "Нұсқалар каталогы әлі жүктелмеді.",
    gameLoadingCatalog: "Нұсқалар каталогы жүктелуде...",
    gameCatalogError: "Нұсқалар каталогының қатесі",
    gameAvailableVersions: "Қолжетімді нұсқалар",
    gameInstalledVersions: "Орнатылған",
    gameInstallVersion: "Жүктеу және орнату",
    gameLaunch: "Іске қосу",
    gameDelete: "Жою",
    gameDeleteConfirm: "Осы орнатылған нұсқаны Falon ішінен жою керек пе?",
    gameDeleteDone: "Нұсқа жойылды",
    gameDeleteError: "Нұсқаны жою қатесі",
    gameVersionSource: "Дереккөз",
    gameInstallStarted: "Нұсқаны орнату басталды",
    gameInstallDone: "Нұсқа орнатылды",
    gameInstallError: "Нұсқаны орнату қатесі",
    gameLaunchError: "Іске қосу қатесі",
    gameNoVersions: "Нұсқалар табылмады",
    gameNoInstalled: "Орнатылған нұсқалар жоқ",
    gameDownloaded: "жүктелді",
    gameInstalling: "Орнатылуда...",
    active: "ACTIVE"
  },
  uk: {
    langName: "Українська",
    appName: "Falon",
    accessKey: "Ключ доступу",
    uploadWallpaper: "Завантажити шпалери",
    exit: "Вийти",
    buyKey: "Купити ключ",
    freeKey: "Free key",
    freeKeyLead: "To receive a free 3-day key, star our GitHub repository.",
    freeKeyOneTime: "Free 3-day access",
    freeKeyNote: "After starring the repository, contact support at @molygench and provide proof plus your GitHub ID.",
    openCreatorXbox: "Contact support: @molygench",
    generateFreeTrial: "Згенерувати ключ на 1 день",
    understood: "Зрозуміло",
    creatorLiveTitle: "Творець лаунчера стримить Minecraft",
    creatorLiveSub: "Приєднуйся!",
    openTikTok: "Відкрити TikTok",
    ready: "Готово",
    wallpaper: "Шпалери",
    windowColor: "Колір вікон",
    windowColorLead: "Оберіть колір сяйва для вікон лаунчера.",
    windowColorPrimary: "Основний",
    windowColorSecondary: "Другий",
    windowColorGradient: "Градієнт",
    windowColorReset: "Скинути",
    refresh: "Оновити",
    blurOn: "Блюр: Увімк",
    blurOff: "Блюр: Вимк",
    upload: "Завантаження",
    myResources: "Мої ресурси",
    worlds: "Світи",
    users: "Користувачі",
    path: "Шлях",
    uploadSub: "Ресурси, аддони та світи.",
    dropFile: "Перетягни файл",
    noFile: "Файл не вибрано",
    file: "Файл",
    profiles: "Профілі",
    all: "Усі",
    clear: "Зняти",
    install: "Встановити",
    resourcesSub: "RP/BP для вибраної версії / User.",
    worldsSub: "Світи вибраної версії / User.",
    uploadToUser: "Завантажити в User",
    status: "Статус",
    profileCount: "Профілів",
    key: "Ключ",
    log: "Лог",
    chooseCurrency: "Оберіть валюту",
    buy: "Купити",
    pricePrefix: "Вартість ключа",
    payNote: "Перед оплатою вкажіть Telegram або пошту, куди буде надіслано код доступу. Час очікування: 5–10 хвилин.",
    wrongKey: "Невірний або прострочений ключ",
    keyExpired: "Термін дії ключа минув",
    keyDeviceMismatch: "Цей ключ уже прив’язаний до іншого комп’ютера",
    keyActivationError: "Не вдалося перевірити ключ",
    keyTimeLeft: "До деактивації",
    profilesFound: "Профілів знайдено",
    scanError: "Помилка сканування",
    chooseFileFirst: "Спочатку виберіть файл",
    dropUnsupported: "Перетягніть .mcpack, .mcaddon, .mcworld або .zip",
    dropPathError: "Не вдалося прочитати шлях до файла — скористайтесь кнопкою «Файл»",
    noUserSelected: "Не вибрано жодного User",
    installing: "Встановлення...",
    installedWorld: "Світ",
    installedTo: "встановлено в",
    oldRemoved: "старих видалено",
    installedPack: "Пак",
    installError: "Помилка встановлення",
    userNotSelected: "User не вибрано",
    resourcesNotFound: "Ресурси не знайдено",
    worldsNotFound: "Світи не знайдено",
    openFolder: "Папка",
    delete: "Видалити",
    deleteResourceConfirm: "Видалити ресурс і прибрати його зі світів?",
    deleteWorldConfirm: "Видалити цей світ?",
    deleted: "Видалено",
    worldDeleted: "Світ видалено",
    deleteError: "Помилка видалення",
    worldDeleteError: "Помилка видалення світу",
    resourcesError: "Помилка ресурсів",
    worldsError: "Помилка світів",
    wallpaperUpdated: "Шпалери оновлено",
    wallpaperError: "Помилка шпалер",
    videoPlaybackError: "Відео вибрано, але воно не відтворилось. Краще MP4 або WEBM.",
    imageLoadError: "Зображення не завантажилось.",
    iconUpdated: "Іконку оновлено",
    iconError: "Помилка іконки",
    iconLoadError: "Іконка не завантажилась",
    checkoutConfirm: "Перед оплатою вкажіть Telegram або пошту, куди буде надіслано код доступу.\n\nЧас очікування: 5–10 хвилин.\n\nПерейти до оплати?",
    network: "Мережа",
    networkSub: "CurseForge для Bedrock.",
    networkSearchPlaceholder: "Пошук Bedrock-контенту",
    networkAllTypes: "Усі типи",
    networkSortDownloads: "За завантаженнями",
    networkSortUpdated: "Оновлені",
    networkSortFeatured: "Рекомендовані",
    networkSortName: "За назвою",
    networkSearchBtn: "Знайти",
    networkInstallProfiles: "Профілі встановлення",
    networkIntro: "Пошук аддонів, карт, текстур і скриптів Bedrock.",
    networkLoading: "Завантажую CurseForge...",
    networkClassLoadError: "Не вдалося завантажити типи CurseForge",
    networkSearchError: "Помилка пошуку CurseForge",
    networkNoResults: "Нічого не знайдено",
    networkInstall: "Встановити",
    networkDownload: "Завантажити",
    networkOpen: "CurseForge",
    networkInstallUnsupported: "Файл є, але формат встановлення не підтримується",
    networkDownloading: "Завантажую з CurseForge...",
    networkInstalling: "Встановлюю з CurseForge...",
    networkInstalled: "CurseForge встановив",
    networkDownloaded: "Файл завантажено",
    networkDownloadCancelled: "Завантаження скасовано",
    networkPage: "Сторінка",
    networkDownloads: "завантажень",
    networkApiKey: "CurseForge API key",
    networkApiKeyPlaceholder: "Встав CurseForge API key",
    networkSaveApiKey: "Зберегти",
    networkKeyReady: "Ключ збережено",
    networkKeyRequired: "Для пошуку потрібен CurseForge API key — встав його тут і збережи.",
    networkKeySaveError: "Не вдалося зберегти CurseForge API key",
    networkKeyBundled: "Вбудований ключ знайдено",
    game: "Гра",
    gameSub: "Версії, встановлення та запуск.",
    gameSearchPlaceholder: "Пошук версії, наприклад 1.21.120",
    gameAllTypes: "Усі",
    gameRelease: "Release",
    gamePreview: "Preview",
    gameLegacy: "Legacy UWP",
    gameRefresh: "Оновити версії",
    gameVersionsFolder: "Тека версій",
    gameInstallersFolder: "Пакети",
    gameReady: "Каталог версій ще не завантажено.",
    gameLoadingCatalog: "Завантажую каталог версій...",
    gameCatalogError: "Помилка каталогу версій",
    gameAvailableVersions: "Доступні версії",
    gameInstalledVersions: "Встановлені",
    gameInstallVersion: "Завантажити й встановити",
    gameLaunch: "Запустити",
    gameDelete: "Видалити",
    gameDeleteConfirm: "Видалити цю встановлену версію з Falon?",
    gameDeleteDone: "Версію видалено",
    gameDeleteError: "Помилка видалення версії",
    gameVersionSource: "Джерело",
    gameInstallStarted: "Починаю встановлення версії",
    gameInstallDone: "Версію встановлено",
    gameInstallError: "Помилка встановлення версії",
    gameLaunchError: "Помилка запуску версії",
    gameNoVersions: "Версії не знайдено",
    gameNoInstalled: "Встановлених версій поки немає",
    gameDownloaded: "завантажено",
    gameInstalling: "Встановлення...",
    active: "ACTIVE"
  },
  tr: {
    langName: "Türkçe",
    appName: "Falon",
    accessKey: "Erişim anahtarı",
    uploadWallpaper: "Duvar kağıdı yükle",
    exit: "Çıkış",
    buyKey: "Anahtar satın al",
    freeKey: "Free key",
    freeKeyLead: "To receive a free 3-day key, star our GitHub repository.",
    freeKeyOneTime: "Free 3-day access",
    freeKeyNote: "After starring the repository, contact support at @molygench and provide proof plus your GitHub ID.",
    openCreatorXbox: "Contact support: @molygench",
    generateFreeTrial: "1 günlük anahtar oluştur",
    understood: "Anladım",
    creatorLiveTitle: "Başlatıcı oluşturucusu Minecraft yayını yapıyor",
    creatorLiveSub: "Yayına katıl!",
    openTikTok: "TikTok'u aç",
    ready: "Hazır",
    wallpaper: "Duvar kağıdı",
    windowColor: "Pencere rengi",
    windowColorLead: "Başlatıcı pencerelerinin parıltı rengini seçin.",
    windowColorPrimary: "Ana",
    windowColorSecondary: "İkinci",
    windowColorGradient: "Gradyan",
    windowColorReset: "Sıfırla",
    refresh: "Yenile",
    blurOn: "Bulanık: Açık",
    blurOff: "Bulanık: Kapalı",
    upload: "Yükleme",
    myResources: "Kaynaklarım",
    worlds: "Dünyalar",
    users: "Kullanıcılar",
    path: "Yol",
    uploadSub: "Kaynaklar, eklentiler ve dünyalar.",
    dropFile: "Dosyayı bırak",
    noFile: "Dosya seçilmedi",
    file: "Dosya",
    profiles: "Profiller",
    all: "Tümü",
    clear: "Temizle",
    install: "Kur",
    resourcesSub: "Seçili sürüm / User için RP/BP.",
    worldsSub: "Seçili sürüm / User dünyaları.",
    uploadToUser: "User içine yükle",
    status: "Durum",
    profileCount: "Profil",
    key: "Anahtar",
    log: "Günlük",
    chooseCurrency: "Para birimini seçin",
    buy: "Satın al",
    pricePrefix: "Anahtar fiyatı",
    payNote: "Ödeme öncesi erişim kodunun gönderileceği Telegram veya e-posta adresini yazın. Bekleme süresi: 5–10 dakika.",
    wrongKey: "Geçersiz veya süresi dolmuş anahtar",
    keyExpired: "Anahtarın süresi doldu",
    keyDeviceMismatch: "Bu anahtar başka bir bilgisayara bağlı",
    keyActivationError: "Anahtar doğrulanamadı",
    keyTimeLeft: "Devre dışı kalmasına",
    profilesFound: "Bulunan profiller",
    scanError: "Tarama hatası",
    chooseFileFirst: "Önce dosya seç",
    dropUnsupported: ".mcpack, .mcaddon, .mcworld veya .zip dosyası bırak",
    dropPathError: "Dosya yolu okunamadı — Dosya düğmesini kullan",
    noUserSelected: "Hiç User seçilmedi",
    installing: "Kuruluyor...",
    installedWorld: "Dünya",
    installedTo: "şuraya kuruldu",
    oldRemoved: "eski kaldırıldı",
    installedPack: "Paket",
    installError: "Kurulum hatası",
    userNotSelected: "User seçilmedi",
    resourcesNotFound: "Kaynak bulunamadı",
    worldsNotFound: "Dünya bulunamadı",
    openFolder: "Klasör",
    delete: "Sil",
    deleteResourceConfirm: "Bu kaynağı silip dünyalardan kaldırmak istiyor musun?",
    deleteWorldConfirm: "Bu dünyayı silmek istiyor musun?",
    deleted: "Silindi",
    worldDeleted: "Dünya silindi",
    deleteError: "Silme hatası",
    worldDeleteError: "Dünya silme hatası",
    resourcesError: "Kaynak hatası",
    worldsError: "Dünya hatası",
    wallpaperUpdated: "Duvar kağıdı güncellendi",
    wallpaperError: "Duvar kağıdı hatası",
    videoPlaybackError: "Video seçildi ama oynatılamadı. MP4 veya WEBM daha iyi.",
    imageLoadError: "Görsel yüklenemedi.",
    iconUpdated: "Simge güncellendi",
    iconError: "Simge hatası",
    iconLoadError: "Simge yüklenemedi",
    checkoutConfirm: "Ödeme öncesi erişim kodunun gönderileceği Telegram veya e-posta adresini yazın.\n\nBekleme süresi: 5–10 dakika.\n\nÖdeme sayfasını aç?",
    network: "Ağ",
    networkSub: "Bedrock için CurseForge.",
    networkSearchPlaceholder: "Bedrock içeriği ara",
    networkAllTypes: "Tüm türler",
    networkSortDownloads: "İndirmeye göre",
    networkSortUpdated: "Yeni güncellenen",
    networkSortFeatured: "Öne çıkan",
    networkSortName: "Ada göre",
    networkSearchBtn: "Ara",
    networkInstallProfiles: "Kurulum profilleri",
    networkIntro: "Bedrock eklentileri, haritaları, dokuları ve scriptlerini ara.",
    networkLoading: "CurseForge yükleniyor...",
    networkClassLoadError: "CurseForge türleri yüklenemedi",
    networkSearchError: "CurseForge arama hatası",
    networkNoResults: "Sonuç bulunamadı",
    networkInstall: "Kur",
    networkDownload: "İndir",
    networkOpen: "CurseForge",
    networkInstallUnsupported: "Dosya var, ancak kurulum biçimi desteklenmiyor",
    networkDownloading: "CurseForge'dan indiriliyor...",
    networkInstalling: "CurseForge'dan kuruluyor...",
    networkInstalled: "CurseForge kurdu",
    networkDownloaded: "Dosya indirildi",
    networkDownloadCancelled: "İndirme iptal edildi",
    networkPage: "Sayfa",
    networkDownloads: "indirme",
    networkApiKey: "CurseForge API key",
    networkApiKeyPlaceholder: "CurseForge API key yapıştır",
    networkSaveApiKey: "Kaydet",
    networkKeyReady: "Anahtar kaydedildi",
    networkKeyRequired: "Arama için CurseForge API key gerekiyor — buraya yapıştırıp kaydet.",
    networkKeySaveError: "CurseForge API key kaydedilemedi",
    networkKeyBundled: "Dahili anahtar bulundu",
    game: "Oyun",
    gameSub: "Sürümler, kurulum ve başlatma.",
    gameSearchPlaceholder: "Sürüm ara, örn. 1.21.120",
    gameAllTypes: "Tümü",
    gameRelease: "Release",
    gamePreview: "Preview",
    gameLegacy: "Legacy UWP",
    gameRefresh: "Sürümleri yenile",
    gameVersionsFolder: "Sürümler klasörü",
    gameInstallersFolder: "Paketler",
    gameReady: "Sürüm kataloğu henüz yüklenmedi.",
    gameLoadingCatalog: "Sürüm kataloğu yükleniyor...",
    gameCatalogError: "Sürüm kataloğu hatası",
    gameAvailableVersions: "Mevcut sürümler",
    gameInstalledVersions: "Kurulu",
    gameInstallVersion: "İndir ve kur",
    gameLaunch: "Başlat",
    gameDelete: "Sil",
    gameDeleteConfirm: "Bu kurulu sürüm Falon'dan silinsin mi?",
    gameDeleteDone: "Sürüm silindi",
    gameDeleteError: "Sürüm silme hatası",
    gameVersionSource: "Kaynak",
    gameInstallStarted: "Sürüm kurulumu başlıyor",
    gameInstallDone: "Sürüm kuruldu",
    gameInstallError: "Sürüm kurulum hatası",
    gameLaunchError: "Sürüm başlatma hatası",
    gameNoVersions: "Sürüm bulunamadı",
    gameNoInstalled: "Henüz kurulu sürüm yok",
    gameDownloaded: "indirildi",
    gameInstalling: "Kuruluyor...",
    active: "ACTIVE"
  }
};

const CURRENCY_DATA = {
  KZT: { label: "🇰🇿 Kazakhstani Tenge", amount: "1000 ₸" },
  RUB: { label: "🇷🇺 Russian Ruble", amount: "200 ₽" },
  USD: { label: "🇺🇸 United States Dollar", amount: "3 $" },
  EUR: { label: "🇪🇺 Euro", amount: "3 €" },
  UAH: { label: "🇺🇦 Ukrainian Hryvnia", amount: "120 ₴" },
  KGS: { label: "🇰🇬 Kyrgyzstani Som", amount: "270 сом" },
  UZS: { label: "🇺🇿 Uzbekistani Sum", amount: "38 000 soʻm" },
  BYN: { label: "🇧🇾 Belarusian Ruble", amount: "10 Br" },
  TRY: { label: "🇹🇷 Turkish Lira", amount: "100 ₺" },
  GBP: { label: "🇬🇧 Pound Sterling", amount: "3 £" },
  CNY: { label: "🇨🇳 Chinese Yuan", amount: "22 ¥" },
  JPY: { label: "🇯🇵 Japanese Yen", amount: "450 ¥" },
  AED: { label: "🇦🇪 UAE Dirham", amount: "12 د.إ" }
};

const BUY_METHODS = {
  fiat: {
    label: "Обычная валюта",
    panel: "buyFiatPanel",
    priceLabel: () => t("buyFiat")
  },
  stars: {
    label: "Telegram Stars",
    panel: "buyStarsPanel",
    priceLabel: () => "Telegram Stars"
  },
  coins: {
    label: "TikTok Coins",
    panel: "buyCoinsPanel",
    priceLabel: () => "TikTok Coins"
  }
};

const BUY_STAR_PLANS = {
  "1d": { label: "1 день", amount: 10 },
  "3d": { label: "3 дня", amount: 35 },
  "7d": { label: "7 дней", amount: 100 },
  "30d": { label: "1 месяц", amount: 200 },
  lifetime: { label: "Навсегда", amount: 350 }
};

const BUY_COIN_PLANS = {
  "1d": { label: "1 день", amount: 25 },
  "3d": { label: "3 дня", amount: 100 },
  "7d": { label: "7 дней", amount: 200 },
  "30d": { label: "30 дней", amount: 450 },
  lifetime: { label: "Навсегда", amount: 800 }
};

const state = {
  root: FALLBACK_ROOT,
  profiles: [],
  file: "",
  lang: localStorage.getItem("falon_lang") || "en",
  backgroundBlur: localStorage.getItem("falon_bg_blur") !== "off",
  uiSquare: localStorage.getItem("falon_ui_square") === "on",
  windowColor: {
    primary: localStorage.getItem("falon_window_color_primary") || "#d6ab49",
    secondary: localStorage.getItem("falon_window_color_secondary") || "#ffd67e",
    gradient: localStorage.getItem("falon_window_color_gradient") !== "off"
  },
  buy: {
    method: localStorage.getItem("falon_buy_method") || "fiat",
    currency: localStorage.getItem("falon_buy_currency") || "KZT",
    starsPlan: localStorage.getItem("falon_buy_stars_plan") || "30d",
    coinsPlan: localStorage.getItem("falon_buy_coins_plan") || "30d"
  },
  network: {
    query: "",
    classId: "",
    sort: "downloads",
    page: 0,
    pageSize: 50,
    totalCount: 0,
    items: [],
    classes: [],
    classesLoaded: false,
    searchedOnce: false,
    selectedProfiles: new Set(),
    isLoading: false,
    isLoadingMore: false,
    hasMore: true,
    autoLoadBound: false,
    installModalProject: null
  },
  game: {
    catalog: null,
    loaded: false,
    loading: false,
    validationCache: null,
    validationArchive: null,
    installed: [],
    filter: (() => {
      const migrationKey = "falon_game_filter_default_all_v1";
      const saved = localStorage.getItem("falon_game_filter");
      if (localStorage.getItem(migrationKey) !== "1") {
        localStorage.setItem(migrationKey, "1");
        if (!saved || saved === "release") {
          localStorage.setItem("falon_game_filter", "all");
          return "all";
        }
      }
      return saved || "all";
    })(),
    query: "",
    installing: false,
    launching: false,
    launchingName: "",
    launchOverlayTimer: null,
    validating: false,
    validationReloadedAt: 0,
    hiddenVersionKeys: {},
    lastProgress: null
  },
  license: null,
  licenseTimer: null,
  creatorLiveToastVisible: false
};

const $ = (id) => document.getElementById(id);
const t = (key) => (I18N[state.lang] && I18N[state.lang][key]) || I18N.ru[key] || key;

function syncLangSelectors() {
  const a = $("langSelectLogin");
  const b = $("langSelectApp");
  if (a) a.value = state.lang;
  if (b) b.value = state.lang;
}

function setLanguage(lang) {
  state.lang = I18N[lang] ? lang : "ru";
  localStorage.setItem("falon_lang", state.lang);
  syncLangSelectors();
  applyLanguage();
}

function syncBackgroundBlurButton() {
  const btn = $("blurToggleBtn");
  if (!btn) return;
  btn.querySelector(".settings-toggle")?.classList.toggle("is-on", state.backgroundBlur);
  btn.classList.toggle("active", state.backgroundBlur);
  btn.setAttribute("aria-pressed", state.backgroundBlur ? "true" : "false");
}

function syncUiShapeButton() {
  const btn = $("uiShapeToggleBtn");
  if (!btn) return;
  btn.querySelector(".settings-toggle")?.classList.toggle("is-on", state.uiSquare);
  btn.classList.toggle("active", state.uiSquare);
  btn.setAttribute("aria-pressed", state.uiSquare ? "true" : "false");
}

function applyUiShape(enabled, save = true) {
  state.uiSquare = Boolean(enabled);
  document.body.classList.toggle("ui-square", state.uiSquare);
  if (save) localStorage.setItem("falon_ui_square", state.uiSquare ? "on" : "off");
  syncUiShapeButton();
}

function toggleUiShape() {
  applyUiShape(!state.uiSquare);
}

function normalizeColor(value, fallback) {
  const text = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
}

function hexToRgb(hex) {
  const clean = normalizeColor(hex, "#d6ab49").slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function rgbText(hex) {
  const { r, g, b } = hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
}

function applyWindowColor(save = true) {
  state.windowColor.primary = normalizeColor(state.windowColor.primary, "#d6ab49");
  state.windowColor.secondary = normalizeColor(state.windowColor.secondary, "#ffd67e");
  const primary = rgbText(state.windowColor.primary);
  const secondary = rgbText(state.windowColor.gradient ? state.windowColor.secondary : state.windowColor.primary);
  const root = document.documentElement;
  root.style.setProperty("--falon-accent", state.windowColor.primary);
  root.style.setProperty("--falon-accent-2", state.windowColor.gradient ? state.windowColor.secondary : state.windowColor.primary);
  root.style.setProperty("--falon-accent-rgb", primary);
  root.style.setProperty("--falon-accent-2-rgb", secondary);
  document.body.classList.toggle("window-gradient-off", !state.windowColor.gradient);

  const primaryInput = $("windowColorPrimary");
  const secondaryInput = $("windowColorSecondary");
  const gradientInput = $("windowColorGradient");
  if (primaryInput) primaryInput.value = state.windowColor.primary;
  if (secondaryInput) secondaryInput.value = state.windowColor.secondary;
  if (gradientInput) gradientInput.checked = state.windowColor.gradient;

  if (save) {
    localStorage.setItem("falon_window_color_primary", state.windowColor.primary);
    localStorage.setItem("falon_window_color_secondary", state.windowColor.secondary);
    localStorage.setItem("falon_window_color_gradient", state.windowColor.gradient ? "on" : "off");
  }
}

function setWindowColor(part, value) {
  if (part === "primary") state.windowColor.primary = normalizeColor(value, state.windowColor.primary);
  if (part === "secondary") state.windowColor.secondary = normalizeColor(value, state.windowColor.secondary);
  applyWindowColor();
}

function setWindowColorGradient(enabled) {
  state.windowColor.gradient = Boolean(enabled);
  applyWindowColor();
}

function resetWindowColor() {
  state.windowColor.primary = "#d6ab49";
  state.windowColor.secondary = "#ffd67e";
  state.windowColor.gradient = true;
  applyWindowColor();
}

function openWindowColorModal() {
  applyWindowColor(false);
  $("windowColorModal")?.classList.remove("hidden");
}

function closeWindowColorModal() {
  $("windowColorModal")?.classList.add("hidden");
}

function applyBackgroundBlur(enabled, save = true) {
  state.backgroundBlur = Boolean(enabled);
  document.body.classList.toggle("bg-blur-off", !state.backgroundBlur);
  if (save) localStorage.setItem("falon_bg_blur", state.backgroundBlur ? "on" : "off");
  syncBackgroundBlurButton();
}

function toggleBackgroundBlur() {
  applyBackgroundBlur(!state.backgroundBlur);
}

function applyLanguage() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    el.setAttribute("placeholder", t(key));
  });

  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    const key = el.getAttribute("data-i18n-title");
    el.setAttribute("title", t(key));
  });

  const activeKey = document.querySelector('[data-i18n="active"]');
  if (activeKey) activeKey.textContent = t("active");

  updatePrice();
  syncBackgroundBlurButton();
  syncUiShapeButton();
  syncBuyControls();
  updateLicenseCountdown();
  renderProfiles();

  const currentResources = document.getElementById("resourcesView")?.classList.contains("active");
  const currentWorlds = document.getElementById("worldsView")?.classList.contains("active");
  const currentNetwork = document.getElementById("networkView")?.classList.contains("active");
  const currentGame = document.getElementById("gameView")?.classList.contains("active");
  if (currentResources) refreshResources();
  if (currentWorlds) refreshWorlds();
  if (currentNetwork) {
    renderNetworkProfiles();
    renderNetworkCategories(state.network.classes || []);
    const snapshot = Array.isArray(state.network.items) ? [...state.network.items] : [];
    renderNetworkResults(snapshot, true);
  }
  if (currentGame) {
    renderGameCatalog();
    renderInstalledGameVersions();
  }
}

function updateClock() {
  const now = new Date();
  const localeMap = { ru: "ru-RU", en: "en-US", kk: "kk-KZ", uk: "uk-UA", tr: "tr-TR" };
  const locale = localeMap[state.lang] || "ru-RU";
  $("clock").textContent = now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  $("date").textContent = now.toLocaleDateString(locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function log(message) {
  const el = $("log");
  if (!el) return;
  const time = new Date().toLocaleTimeString("ru-RU");
  el.textContent = `[${time}] ${message}\n` + el.textContent;
  const status = $("statusText");
  if (status) status.textContent = message;
}

function fmtSize(bytes) {
  if (!bytes) return "0 Р‘";
  const units = ["Р‘", "РљР‘", "РњР‘", "Р“Р‘"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function applyWallpaper(data) {
  const img = $("wallpaperImage");
  const video = $("wallpaperVideo");

  img.classList.add("hidden");
  video.classList.add("hidden");

  try {
    video.pause();
  } catch {}

  img.removeAttribute("src");
  video.removeAttribute("src");

  if (!data || !data.url || !data.kind) return;

  const safeUrl = `${data.url}${data.url.includes("?") ? "&" : "?"}v=${data.ts || Date.now()}`;

  if (data.kind === "video") {
    video.src = safeUrl;
    video.classList.remove("hidden");
    video.load();
    video.play().catch(() => {
      if (!$("appScreen").classList.contains("hidden")) log(t("videoPlaybackError"));
      else $("loginError").textContent = t("videoPlaybackError");
    });
  } else {
    img.onload = () => {};
    img.onerror = () => {
      if (!$("appScreen").classList.contains("hidden")) log(t("imageLoadError"));
      else $("loginError").textContent = t("imageLoadError");
    };
    img.src = safeUrl;
    img.classList.remove("hidden");
  }
}

async function pickWallpaper() {
  try {
    const data = await window.mcApi.pickWallpaper();
    if (!data) return;
    localStorage.setItem("mc_wallpaper", JSON.stringify(data));
    applyWallpaper(data);
    if (!$("appScreen").classList.contains("hidden")) log(t("wallpaperUpdated"));
  } catch (e) {
    if (!$("appScreen").classList.contains("hidden")) log(`${t("wallpaperError")}: ${e.message}`);
    else $("loginError").textContent = e.message;
  }
}

async function loadSavedWallpaper() {
  try {
    const saved = JSON.parse(localStorage.getItem("mc_wallpaper") || "null");
    if (saved) {
      applyWallpaper(saved);
      return;
    }

    const fallback = await window.mcApi.getDefaultWallpaper?.();
    applyWallpaper(fallback);
  } catch {}
}

function applyLauncherIcon(data) {
  const icon = $("launcherIconImg");
  if (!icon) return;

  const defaultIcon = "./assets/falon-avatar.png";
  if (!data || !data.url) {
    icon.src = defaultIcon;
    return;
  }

  const safeUrl = `${data.url}${data.url.includes("?") ? "&" : "?"}v=${data.ts || Date.now()}`;
  icon.onerror = () => {
    icon.src = defaultIcon;
    if (!$("appScreen").classList.contains("hidden")) log(t("iconLoadError"));
    else $("loginError").textContent = t("iconLoadError");
  };
  icon.src = safeUrl;
}

async function pickLauncherIcon() {
  try {
    const data = await window.mcApi.pickLauncherIcon();
    if (!data) return;
    localStorage.setItem("falon_launcher_icon", JSON.stringify(data));
    applyLauncherIcon(data);
    if (!$("appScreen").classList.contains("hidden")) log(t("iconUpdated"));
  } catch (e) {
    if (!$("appScreen").classList.contains("hidden")) log(`${t("iconError")}: ${e.message}`);
    else $("loginError").textContent = e.message;
  }
}

function loadSavedLauncherIcon() {
  try {
    const saved = JSON.parse(localStorage.getItem("falon_launcher_icon") || "null");
    applyLauncherIcon(saved);
  } catch {
    applyLauncherIcon(null);
  }
}

function syncBuyMethodTabs() {
  document.querySelectorAll(".payment-tab").forEach((btn) => {
    const active = btn.dataset.payMethod === state.buy.method;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
  document.querySelectorAll(".buy-panel").forEach((panel) => {
    panel.classList.toggle("hidden", panel.id !== BUY_METHODS[state.buy.method]?.panel);
  });
}

function getBuyPriceInfo() {
  if (state.buy.method === "stars") {
    const plan = BUY_STAR_PLANS[state.buy.starsPlan] || BUY_STAR_PLANS["30d"];
    return { title: "Telegram Stars", label: plan.label, amount: `${plan.amount} Stars` };
  }
  if (state.buy.method === "coins") {
    const plan = BUY_COIN_PLANS[state.buy.coinsPlan] || BUY_COIN_PLANS["30d"];
    return { title: "TikTok Coins", label: plan.label, amount: `${plan.amount} Coins` };
  }
  const item = CURRENCY_DATA[state.buy.currency] || CURRENCY_DATA.KZT;
  return { title: item.label, label: item.label, amount: item.amount };
}

function updatePrice() {
  const btn = $("priceBtn");
  if (!btn) return;
  const info = getBuyPriceInfo();
  btn.innerHTML = `<span class="buy-summary-top">${BUY_METHODS[state.buy.method]?.label || t("buyFiat")}</span><strong>${info.amount}</strong><em>${info.label}</em>`;
}

function syncBuyControls() {
  const currency = $("currencySelect");
  const starsPlan = $("starsPlanSelect");
  const coinsPlan = $("coinsPlanSelect");
  if (currency) currency.value = state.buy.currency;
  if (starsPlan) starsPlan.value = state.buy.starsPlan;
  if (coinsPlan) coinsPlan.value = state.buy.coinsPlan;
  syncBuyMethodTabs();
  updatePrice();
}

function setBuyMethod(method) {
  if (!BUY_METHODS[method]) method = "fiat";
  state.buy.method = method;
  localStorage.setItem("falon_buy_method", method);
  syncBuyControls();
}

function setBuyCurrency(currency) {
  state.buy.currency = currency;
  localStorage.setItem("falon_buy_currency", currency);
  updatePrice();
}

function setBuyStarPlan(plan) {
  state.buy.starsPlan = plan;
  localStorage.setItem("falon_buy_stars_plan", plan);
  updatePrice();
}

function setBuyCoinPlan(plan) {
  state.buy.coinsPlan = plan;
  localStorage.setItem("falon_buy_coins_plan", plan);
  updatePrice();
}

function openBuyModal() {
  $("buyModal").classList.remove("hidden");
  syncBuyControls();
}

function closeBuyModal() {
  $("buyModal").classList.add("hidden");
}

function openCheckoutModal() {
  $("checkoutModal")?.classList.remove("hidden");
}

function closeCheckoutModal() {
  $("checkoutModal")?.classList.add("hidden");
}

function setFreeTrialUi(status) {
  const statusBox = $("freeTrialStatus");
  const button = $("generateFreeTrialBtn");
  if (!statusBox || !button) return;

  if (!status) {
    statusBox.textContent = "Checking free key status...";
    button.disabled = true;
    return;
  }

  button.disabled = !status.canGenerate;
  if (status.canGenerate) {
    statusBox.textContent = "Free 1-day key is available now.";
    return;
  }

  statusBox.textContent = `Next free key in ${formatRemainingLicenseTime(Number(status.remainingMs || 0))}.`;
}

async function refreshFreeTrialStatus() {
  try {
    const status = await window.mcApi.freeTrialStatus();
    setFreeTrialUi(status);
  } catch {
    setFreeTrialUi({ canGenerate: false, remainingMs: 0 });
  }
}

function openFreeKeyModal() {
  $("freeKeyModal")?.classList.remove("hidden");
  const output = $("freeTrialKeyOutput");
  if (output) output.classList.add("hidden");
  refreshFreeTrialStatus();
}

function closeFreeKeyModal() {
  $("freeKeyModal")?.classList.add("hidden");
}

async function generateFreeTrialKey() {
  const button = $("generateFreeTrialBtn");
  const output = $("freeTrialKeyOutput");
  if (button) button.disabled = true;

  try {
    const result = await window.mcApi.generateFreeTrialKey();
    if (!result?.ok) {
      setFreeTrialUi(result);
      return;
    }

    if (output) {
      output.value = result.key || "";
      output.classList.remove("hidden");
      output.select();
    }
    if ($("accessKey")) $("accessKey").value = result.key || "";
    try { await navigator.clipboard?.writeText(result.key || ""); } catch {}
    setFreeTrialUi(result);
    if ($("freeTrialStatus")) $("freeTrialStatus").textContent = "1-day key generated, copied and activated on this PC.";
    if (result.license?.valid) openAppWithLicense(result.license);
  } catch (error) {
    if ($("freeTrialStatus")) $("freeTrialStatus").textContent = String(error?.message || error || "Free key error");
  } finally {
    await refreshFreeTrialStatus();
  }
}

function showCreatorLiveToast(payload = {}) {
  const toast = $("creatorLiveToast");
  if (!toast) return;
  state.creatorLiveToastVisible = true;
  toast.classList.remove("hidden");
  toast.dataset.detectedAt = String(payload?.detectedAt || Date.now());
  log(`${t("creatorLiveTitle")}. ${t("creatorLiveSub")}`);
}

function closeCreatorLiveToast() {
  const toast = $("creatorLiveToast");
  if (!toast) return;
  state.creatorLiveToastVisible = false;
  toast.classList.add("hidden");
}

async function openCreatorLiveStream() {
  try {
    await window.mcApi.openCreatorStream();
  } catch (error) {
    log(String(error?.message || error));
  }
}

async function openCreatorXboxProfile() {
  try {
    await window.mcApi.openCreatorXboxProfile();
  } catch (error) {
    log(String(error?.message || error));
  }
}

async function goCheckout() {
  openCheckoutModal();
}

async function confirmCheckout() {
  closeCheckoutModal();
  await window.mcApi.openCheckout();
}

function formatRemainingLicenseTime(ms) {
  const safe = Math.max(0, Number(ms || 0));
  const totalSeconds = Math.floor(safe / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}Рґ ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateLicenseCountdown() {
  const badge = $("licenseCountdown");
  if (!badge) return;
  const license = state.license;
  if (!license || !license.valid || license.type !== "temporary" || !license.expiresAt) {
    badge.classList.add("hidden");
    badge.textContent = "";
    return;
  }

  const remainingMs = Number(license.expiresAt) - Date.now();
  if (remainingMs <= 0) {
    expireActiveLicense();
    return;
  }

  badge.textContent = `${t("keyTimeLeft")}: ${formatRemainingLicenseTime(remainingMs)}`;
  badge.classList.remove("hidden");
}

function stopLicenseCountdown() {
  if (state.licenseTimer) {
    clearInterval(state.licenseTimer);
    state.licenseTimer = null;
  }
}

function startLicenseCountdown(license) {
  state.license = license || null;
  stopLicenseCountdown();
  updateLicenseCountdown();
  if (state.license?.valid && state.license.type === "temporary") {
    state.licenseTimer = setInterval(updateLicenseCountdown, 1000);
  }
}

function getSavedAccessKey() {
  return String(localStorage.getItem("falon_last_access_key") || "").trim();
}

function setSavedAccessKey(key) {
  const normalized = String(key || "").trim().toUpperCase();
  if (normalized) localStorage.setItem("falon_last_access_key", normalized);
}

function prefillSavedAccessKey() {
  const input = $("accessKey");
  if (!input) return;
  const saved = getSavedAccessKey();
  if (saved && !input.value) input.value = saved;
}

function openAppWithLicense(license) {
  startLicenseCountdown(license);
  localStorage.setItem("mc_access_session", "1");
  $("loginError").textContent = "";
  $("loginScreen").classList.add("hidden");
  $("appScreen").classList.remove("hidden");
  scan();
}

async function expireActiveLicense() {
  stopLicenseCountdown();
  state.license = null;
  localStorage.removeItem("mc_access_session");
  $("appScreen").classList.add("hidden");
  $("loginScreen").classList.remove("hidden");
  $("loginError").textContent = t("keyExpired");
  prefillSavedAccessKey();
  $("accessKey").focus();
  updateLicenseCountdown();
}

async function login() {
  const key = $("accessKey").value.trim();
  try {
    const result = await window.mcApi.activateLicense(key);
    if (!result?.valid) {
      $("loginError").textContent = result?.deviceMismatch ? t("keyDeviceMismatch") : result?.expired ? t("keyExpired") : t("wrongKey");
      prefillSavedAccessKey();
      $("accessKey").focus();
      return;
    }
    setSavedAccessKey(key);
    openAppWithLicense(result);
  } catch (error) {
    $("loginError").textContent = `${t("keyActivationError")}: ${String(error?.message || error)}`;
  }
}

function logout() {
  stopLicenseCountdown();
  state.license = null;
  localStorage.removeItem("mc_access_session");
  $("appScreen").classList.add("hidden");
  $("loginScreen").classList.remove("hidden");
  prefillSavedAccessKey();
  $("accessKey").focus();
  updateLicenseCountdown();
}

function setView(view) {
  const allowed = new Set(["home", "install", "resources", "worlds", "game"]);
  const nextView = allowed.has(view) ? view : "home";

  document.querySelectorAll(".hub-btn, .menu-btn").forEach(b => b.classList.toggle("active", b.dataset.view === nextView));
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));

  const target = $(`${nextView}View`);
  if (target) target.classList.add("active");

  const app = $("appScreen");
  if (app) app.classList.toggle("home-mode", nextView === "home");

  const homeBtn = $("homeBtn");
  if (homeBtn) homeBtn.classList.toggle("hidden", nextView === "home");

  if (nextView === "resources") refreshResources();
  if (nextView === "worlds") refreshWorlds();
  if (nextView === "game") initializeGameView();
}

function renderProfiles() {
  const count = $("profileCount");
  if (count) count.textContent = String(state.profiles.length);

  const box = $("profilesBox");
  if (!box) return;
  box.innerHTML = "";

  for (const p of state.profiles) {
    const item = document.createElement("label");
    item.className = "item check-row";
    item.innerHTML = `
      <input type="checkbox" class="profileCheck" value="${escapeHtml(p.id)}" checked />
      <div>
        <b>${escapeHtml(p.name)}</b>
        <div class="path">${escapeHtml(p.path)}</div>
      </div>
    `;
    box.appendChild(item);
  }

  renderNetworkProfiles();
  renderNetworkInstallProfiles();

  const resourceSelect = $("resourceProfile");
  const worldSelect = $("worldProfile");
  if (!resourceSelect || !worldSelect) return;
  const oldR = resourceSelect.value;
  const oldW = worldSelect.value;
  resourceSelect.innerHTML = "";
  worldSelect.innerHTML = "";

  for (const p of state.profiles) {
    resourceSelect.add(new Option(p.name, p.path));
    worldSelect.add(new Option(p.name, p.path));
  }

  if (oldR) resourceSelect.value = oldR;
  if (oldW) worldSelect.value = oldW;
}

async function loadDefaultRoot() {
  const saved = localStorage.getItem("falon_root_path");
  let detected = "";

  try {
    detected = await window.mcApi.getDefaultRoot();
  } catch {}

  state.root = saved || detected || FALLBACK_ROOT;
  if ($("rootPath")) $("rootPath").value = state.root;
}

async function scan() {
  state.root = $("rootPath").value.trim() || state.root || FALLBACK_ROOT;

  try {
    const res = await window.mcApi.scan(state.root);
    state.root = res.root || state.root;
    if ($("rootPath") && state.root) $("rootPath").value = state.root;
    if (state.root) localStorage.setItem("falon_root_path", state.root);
    state.profiles = res.profiles;
    renderProfiles();
    log(`${t("profilesFound")}: ${state.profiles.length}`);
  } catch (e) {
    log(`${t("scanError")}: ${e.message}`);
  }
}

function selectedProfileIds() {
  return [...document.querySelectorAll(".profileCheck:checked")].map(e => e.value);
}

function profilePayloadForIds(ids = []) {
  const selected = new Set((ids || []).map((id) => String(id)));
  return state.profiles
    .filter((profile) => selected.has(String(profile.id)))
    .map((profile) => ({
      id: String(profile.id || ""),
      name: String(profile.name || profile.baseName || "User"),
      path: String(profile.path || "")
    }))
    .filter((profile) => profile.id && profile.path);
}

function selectedNetworkProfileIds() {
  return [...state.network.selectedProfiles];
}

function friendlyNetworkError(error) {
  let message = String(error?.message || error || "").trim();
  message = message.replace(/^Error invoking remote method '[^']+': Error:\s*/i, "");
  message = message.replace(/^Error:\s*/i, "");

  const parts = message
    .split("|")
    .map(part => part.trim())
    .filter(Boolean);
  const unique = [];
  for (const part of parts) {
    if (!unique.includes(part)) unique.push(part);
  }
  return (unique.join(" | ") || t("networkSearchError")).trim();
}

function renderNetworkProfiles() {
  const box = $("networkProfilesBox");
  if (!box) return;

  const availableIds = new Set(state.profiles.map(profile => String(profile.id)));
  state.network.selectedProfiles = new Set(
    [...state.network.selectedProfiles].filter(id => availableIds.has(String(id)))
  );

  if (state.profiles.length && state.network.selectedProfiles.size === 0 && !state.network.searchedOnce) {
    state.network.selectedProfiles = new Set(state.profiles.map(profile => String(profile.id)));
  }

  box.innerHTML = "";
  if (!state.profiles.length) {
    box.innerHTML = `<div class="item network-empty">${t("userNotSelected")}</div>`;
    return;
  }

  for (const profile of state.profiles) {
    const item = document.createElement("label");
    item.className = "item check-row network-profile-chip";
    const id = String(profile.id);
    const checked = state.network.selectedProfiles.has(id) ? "checked" : "";
    item.innerHTML = `
      <input type="checkbox" class="networkProfileCheck" value="${escapeHtml(id)}" ${checked} />
      <div>
        <b>${escapeHtml(profile.name)}</b>
        <div class="path">${escapeHtml(profile.path)}</div>
      </div>
    `;

    item.querySelector(".networkProfileCheck").addEventListener("change", (event) => {
      if (event.target.checked) state.network.selectedProfiles.add(id);
      else state.network.selectedProfiles.delete(id);
    });

    box.appendChild(item);
  }
}

function renderNetworkInstallVersions() {
  const select = $("networkInstallVersion");
  if (!select) return;

  const catalogItems = flattenGameCatalog();
  const seen = new Set();
  const options = [{ value: "auto", label: "РђРІС‚Рѕ" }];

  for (const item of catalogItems) {
    const version = String(item.version || item.short || "").trim();
    if (!version) continue;
    const key = `${item.bucket}|${version}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({ value: `${item.bucket}:${version}`, label: `${version} В· ${gameTypeLabel(item.bucket)}` });
    if (options.length >= 16) break;
  }

  const current = select.value || "auto";
  select.innerHTML = "";
  for (const option of options) select.add(new Option(option.label, option.value));
  select.value = options.some(option => option.value === current) ? current : "auto";
}

function renderNetworkInstallProfiles() {
  const box = $("networkInstallProfilesBox");
  const summary = $("networkInstallProfilesSummary");
  if (!box) return;

  const availableIds = new Set(state.profiles.map(profile => String(profile.id)));
  state.network.selectedProfiles = new Set(
    [...state.network.selectedProfiles].filter(id => availableIds.has(String(id)))
  );

  if (state.profiles.length && state.network.selectedProfiles.size === 0 && !state.network.searchedOnce) {
    state.network.selectedProfiles = new Set(state.profiles.map(profile => String(profile.id)));
  }

  box.innerHTML = "";
  if (!state.profiles.length) {
    box.innerHTML = `<div class="item network-empty">${t("userNotSelected")}</div>`;
    if (summary) summary.textContent = t("userNotSelected");
    return;
  }

  for (const profile of state.profiles) {
    const id = String(profile.id);
    const item = document.createElement("label");
    item.className = "item check-row network-install-chip";
    item.innerHTML = `
      <input type="checkbox" class="networkInstallProfileCheck" value="${escapeHtml(id)}" ${state.network.selectedProfiles.has(id) ? "checked" : ""} />
      <div>
        <b>${escapeHtml(profile.name)}</b>
        <div class="path">${escapeHtml(profile.path)}</div>
      </div>
    `;
    item.querySelector(".networkInstallProfileCheck")?.addEventListener("change", (event) => {
      if (event.target.checked) state.network.selectedProfiles.add(id);
      else state.network.selectedProfiles.delete(id);
      updateNetworkInstallProfileSummary();
    });
    box.appendChild(item);
  }

  updateNetworkInstallProfileSummary();
}

function updateNetworkInstallProfileSummary() {
  const summary = $("networkInstallProfilesSummary");
  if (!summary) return;
  const count = state.network.selectedProfiles.size;
  summary.textContent = count ? `${count} / ${state.profiles.length}` : t("userNotSelected");
}

function openNetworkInstallModal(project) {
  if (!project) return;
  state.network.installModalProject = project;
  renderNetworkInstallVersions();
  renderNetworkInstallProfiles();
  $("networkInstallModal")?.classList.remove("hidden");
  if (!state.game.loaded && !state.game.loading) {
    loadGameCatalog(true).finally(() => renderNetworkInstallVersions());
  }
}

function closeNetworkInstallModal() {
  state.network.installModalProject = null;
  $("networkInstallModal")?.classList.add("hidden");
}

async function confirmNetworkInstallModal() {
  const project = state.network.installModalProject;
  const version = $("networkInstallVersion")?.value || "auto";
  if (!project) return;
  const profileIds = selectedNetworkProfileIds();
  if (!profileIds.length) {
    log(t("noUserSelected"));
    return;
  }

  closeNetworkInstallModal();
  log(`РЎРµС‚СЊ: ${project.name} в†’ ${version}`);
  await installNetworkProject(project, { targetVersion: version, profileIds });
}

function fmtCompactCount(value) {
  const amount = Math.max(0, Number(value || 0));
  try {
    const localeMap = { ru: "ru-RU", en: "en-US", kk: "kk-KZ", uk: "uk-UA", tr: "tr-TR" };
    return new Intl.NumberFormat(localeMap[state.lang] || "ru-RU", {
      notation: amount >= 10000 ? "compact" : "standard",
      maximumFractionDigits: 1
    }).format(amount);
  } catch {
    return String(amount);
  }
}

function setNetworkSummary(text) {
  const el = $("networkSummary");
  if (el) el.textContent = text;
}

function updateNetworkSummary() {
  const shown = state.network.items.length;
  const total = Math.max(shown, Number(state.network.totalCount || 0));
  if (state.network.isLoading) {
    setNetworkSummary(t("networkLoading"));
    return;
  }
  if (!state.network.searchedOnce) {
    setNetworkSummary(t("networkIntro"));
    return;
  }
  if (!shown) {
    setNetworkSummary(t("networkNoResults"));
    return;
  }
  const suffix = state.network.isLoadingMore
    ? t("networkLoadingMore")
    : state.network.hasMore
      ? t("networkScrollMore")
      : t("networkAllLoaded");
  setNetworkSummary(`${t("networkShowing")} ${fmtCompactCount(shown)} / ${fmtCompactCount(total)} В· ${suffix}`);
}

function classOrderScore(item) {
  const source = `${item?.slug || ""} ${item?.name || ""}`.toLowerCase();
  if (source.includes("addon")) return 1;
  if (source.includes("texture") || source.includes("resource")) return 2;
  if (source.includes("shader")) return 3;
  if (source.includes("map") || source.includes("world")) return 4;
  if (source.includes("script")) return 5;
  return 20;
}

function renderNetworkCategories(classes = []) {
  const bar = $("networkCategoryBar");
  if (!bar) return;

  const normalized = Array.isArray(classes)
    ? classes.filter(item => item && item.id).slice().sort((a, b) => {
        const score = classOrderScore(a) - classOrderScore(b);
        return score || String(a.name || "").localeCompare(String(b.name || ""));
      })
    : [];

  state.network.classes = normalized;
  bar.innerHTML = "";

  const buttons = [
    { id: "", label: t("networkAllTypes") },
    ...normalized.map(item => ({ id: String(item.id), label: String(item.name || item.slug || item.id) }))
  ];

  for (const item of buttons) {
    const button = document.createElement("button");
    button.className = "network-category";
    if (String(state.network.classId || "") === String(item.id || "")) button.classList.add("is-active");
    button.dataset.classId = String(item.id || "");
    button.textContent = item.label;
    button.onclick = () => {
      state.network.classId = button.dataset.classId || "";
      bar.querySelectorAll(".network-category").forEach(el => {
        el.classList.toggle("is-active", el === button);
      });
      searchNetwork(true);
    };
    bar.appendChild(button);
  }
}

function createNetworkCard(project) {
  const card = document.createElement("article");
  card.className = "network-card cut-small";
  const file = project.file || null;
  const canInstall = Boolean(project.canInstall && file && file.id);
  const thumb = String(project?.screenshots?.[0]?.thumbnailUrl || project?.screenshots?.[0]?.url || project.logo || "").trim();
  const logo = thumb
    ? `<img class="network-thumb" src="${escapeHtml(thumb)}" alt="" loading="lazy" />`
    : `<div class="network-thumb network-thumb-fallback">CF</div>`;
  const category = project.category ? `<span class="badge">${escapeHtml(project.category)}</span>` : "";
  const summary = project.summary ? escapeHtml(project.summary) : "вЂ”";

  card.innerHTML = `
    <div class="network-thumb-wrap">${logo}</div>
    <div class="network-card-body">
      <div class="network-card-title">
        <b title="${escapeHtml(project.name || "CurseForge")}">${escapeHtml(project.name || "CurseForge")}</b>
        ${category}
      </div>
      <p>${summary}</p>
      <div class="network-meta">${escapeHtml(project.author || "CurseForge")} В· ${fmtCompactCount(project.downloads)} ${t("networkDownloads")}</div>
      <div class="actions network-actions">
        <button class="networkDetailsBtn">${t("networkDetails")}</button>
        <button class="networkInstallBtn" ${canInstall ? "" : "disabled"}>${t("networkInstall")}</button>
        <button class="networkDownloadBtn" ${canInstall ? "" : "disabled"}>${t("networkDownload")}</button>
      </div>
    </div>
  `;

  card.querySelector(".networkDetailsBtn")?.addEventListener("click", () => openNetworkDetails(project));
  card.querySelector(".networkInstallBtn")?.addEventListener("click", () => {
    if (!canInstall) {
      log(t("networkInstallUnsupported"));
      return;
    }
    openNetworkInstallModal(project);
  });
  card.querySelector(".networkDownloadBtn")?.addEventListener("click", () => {
    if (!canInstall) {
      log(t("networkInstallUnsupported"));
      return;
    }
    downloadNetworkProject(project);
  });
  card.querySelector(".network-thumb-wrap")?.addEventListener("click", () => openNetworkDetails(project));
  card.querySelector(".network-card-title b")?.addEventListener("click", () => openNetworkDetails(project));
  return card;
}

function renderNetworkFooter(box) {
  if (!box) return;
  box.querySelector(".network-feed-footer")?.remove();

  const footer = document.createElement("div");
  footer.className = "network-feed-footer";
  if (state.network.isLoadingMore || state.network.isLoading) {
    footer.innerHTML = `<span class="network-loader-dot"></span><span>${t("networkLoadingMore")}</span>`;
  } else if (state.network.hasMore && state.network.items.length) {
    footer.textContent = t("networkScrollMore");
  } else if (!state.network.hasMore && state.network.items.length) {
    footer.textContent = t("networkAllLoaded");
  } else {
    footer.textContent = "";
  }
  box.appendChild(footer);
}

function renderNetworkResults(items = [], reset = false) {
  const box = $("networkResults");
  if (!box) return;

  if (reset) {
    state.network.items = [];
    box.innerHTML = "";
    box.scrollTop = 0;
  }

  const incoming = Array.isArray(items) ? items : [];
  if (incoming.length) {
    state.network.items.push(...incoming);
    for (const project of incoming) box.appendChild(createNetworkCard(project));
  }

  if (!state.network.items.length && !state.network.isLoading && !state.network.isLoadingMore) {
    box.innerHTML = `<div class="item network-empty">${t("networkNoResults")}</div>`;
  }

  renderNetworkFooter(box);
  updateNetworkSummary();
}

function openNetworkDetails(project) {
  const modal = $("networkDetailsModal");
  const content = $("networkDetailsContent");
  if (!modal || !content || !project) return;

  const file = project.file || null;
  const canInstall = Boolean(project.canInstall && file && file.id);
  const logo = project.logo
    ? `<img class="network-details-logo" src="${escapeHtml(project.logo)}" alt="" />`
    : `<div class="network-details-logo network-thumb-fallback">CF</div>`;
  const screenshots = Array.isArray(project.screenshots) ? project.screenshots : [];
  const gallery = screenshots.length
    ? `<div class="network-details-gallery">${screenshots.map(shot => {
        const src = escapeHtml(shot.url || shot.thumbnailUrl || "");
        const title = escapeHtml(shot.title || project.name || "Preview");
        return src ? `<img src="${src}" title="${title}" alt="" loading="lazy" />` : "";
      }).join("")}</div>`
    : "";

  content.innerHTML = `
    <div class="network-details-head">
      ${logo}
      <div>
        <h3>${escapeHtml(project.name || "CurseForge")}</h3>
        <p>${escapeHtml(project.author || "CurseForge")} В· ${fmtCompactCount(project.downloads)} ${t("networkDownloads")}</p>
        <span class="badge">${escapeHtml(project.category || "Bedrock")}</span>
      </div>
    </div>
    <div class="network-details-summary">${escapeHtml(project.summary || "вЂ”")}</div>
    ${gallery}
    <div class="network-details-actions">
      <button id="networkDetailsInstall" ${canInstall ? "" : "disabled"}>${t("networkInstall")}</button>
      <button id="networkDetailsDownload" ${canInstall ? "" : "disabled"}>${t("networkDownload")}</button>
      <button id="networkDetailsOpen" ${project.websiteUrl ? "" : "disabled"}>${t("networkOpen")}</button>
    </div>
  `;

  content.querySelector("#networkDetailsInstall")?.addEventListener("click", () => openNetworkInstallModal(project));
  content.querySelector("#networkDetailsDownload")?.addEventListener("click", () => downloadNetworkProject(project));
  content.querySelector("#networkDetailsOpen")?.addEventListener("click", async () => {
    if (!project.websiteUrl) return;
    try {
      await window.mcApi.openCurseForgePage(project.websiteUrl);
    } catch (error) {
      log(`${t("networkSearchError")}: ${friendlyNetworkError(error)}`);
    }
  });

  modal.classList.remove("hidden");
}

function closeNetworkDetails() {
  $("networkDetailsModal")?.classList.add("hidden");
}

async function loadNetworkSettings() {
  const statusEl = $("networkApiStatus");
  try {
    const settings = await window.mcApi.curseforgeSettings();
    if (statusEl) {
      statusEl.textContent = settings?.hasApiKey
        ? `${settings.apiKeySource === "bundled" ? t("networkKeyBundled") : t("networkKeyReady")}${settings.apiKeyMasked ? ` В· ${settings.apiKeyMasked}` : ""}`
        : t("networkKeyRequired");
      statusEl.classList.toggle("is-ready", Boolean(settings?.hasApiKey));
    }
    return settings || { hasApiKey: false };
  } catch (error) {
    if (statusEl) statusEl.textContent = `${t("networkSearchError")}: ${friendlyNetworkError(error)}`;
    return { hasApiKey: false };
  }
}

async function saveNetworkSettings() {
  const input = $("networkApiKey");
  const statusEl = $("networkApiStatus");
  const apiKey = input?.value?.trim() || "";
  try {
    const settings = await window.mcApi.curseforgeSaveSettings({ apiKey });
    if (input) input.value = "";
    state.network.classesLoaded = false;
    state.network.searchedOnce = false;
    state.network.page = 0;
    state.network.items = [];
    state.network.hasMore = true;
    if (statusEl) {
      statusEl.textContent = settings?.hasApiKey
        ? `${settings.apiKeySource === "bundled" ? t("networkKeyBundled") : t("networkKeyReady")}${settings.apiKeyMasked ? ` В· ${settings.apiKeyMasked}` : ""}`
        : t("networkKeyRequired");
      statusEl.classList.toggle("is-ready", Boolean(settings?.hasApiKey));
    }
    if (settings?.hasApiKey) {
      log(t("networkKeyReady"));
      await loadNetworkClasses();
      await searchNetwork(true);
    } else {
      setNetworkSummary(t("networkKeyRequired"));
      renderNetworkResults([], true);
    }
  } catch (error) {
    const message = friendlyNetworkError(error);
    if (statusEl) statusEl.textContent = `${t("networkKeySaveError")}: ${message}`;
    log(`${t("networkKeySaveError")}: ${message}`);
  }
}

function bindNetworkInfiniteScroll() {
  const box = $("networkResults");
  if (!box || state.network.autoLoadBound) return;
  state.network.autoLoadBound = true;

  box.addEventListener("scroll", () => {
    const nearBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 180;
    if (nearBottom) loadMoreNetworkResults();
  }, { passive: true });
}

async function initializeNetworkView() {
  renderNetworkProfiles();
  bindNetworkInfiniteScroll();
  const settings = await loadNetworkSettings();
  if (!settings?.hasApiKey) {
    setNetworkSummary(t("networkKeyRequired"));
    renderNetworkCategories([]);
    renderNetworkResults([], true);
    return;
  }
  await loadNetworkClasses();
  if (!state.network.searchedOnce) await searchNetwork(true);
}

async function loadNetworkClasses() {
  if (state.network.classesLoaded) {
    renderNetworkCategories(state.network.classes);
    return;
  }

  try {
    const classes = await window.mcApi.curseforgeClasses();
    state.network.classes = Array.isArray(classes) ? classes : [];
    state.network.classesLoaded = true;
    renderNetworkCategories(state.network.classes);
  } catch (error) {
    const message = friendlyNetworkError(error);
    renderNetworkCategories([]);
    log(`${t("networkClassLoadError")}: ${message}`);
  }
}

async function fetchNetworkPage(page) {
  return window.mcApi.curseforgeSearch({
    query: state.network.query,
    classId: state.network.classId,
    sort: state.network.sort,
    page,
    pageSize: state.network.pageSize
  });
}

async function searchNetwork(resetFeed = false) {
  if (state.network.isLoading) return;
  const settings = await loadNetworkSettings();
  if (!settings?.hasApiKey) {
    setNetworkSummary(t("networkKeyRequired"));
    renderNetworkResults([], true);
    return;
  }

  state.network.query = $("networkSearch")?.value.trim() || "";
  state.network.sort = $("networkSort")?.value || "downloads";
  state.network.searchedOnce = true;

  if (resetFeed) {
    state.network.page = 0;
    state.network.totalCount = 0;
    state.network.items = [];
    state.network.hasMore = true;
  }

  state.network.isLoading = true;
  setNetworkSummary(t("networkLoading"));
  renderNetworkResults([], true);

  try {
    const response = await fetchNetworkPage(0);
    const pagination = response?.pagination || {};
    const items = Array.isArray(response?.items) ? response.items : [];
    state.network.totalCount = Math.max(0, Number(pagination.totalCount || 0));
    state.network.page = 1;
    state.network.hasMore = items.length > 0 && state.network.items.length + items.length < state.network.totalCount;
    state.network.isLoading = false;
    renderNetworkResults(items, true);
    if (!state.network.totalCount && items.length) {
      state.network.totalCount = items.length;
      state.network.hasMore = items.length >= state.network.pageSize;
      updateNetworkSummary();
    }
  } catch (error) {
    const message = friendlyNetworkError(error);
    state.network.isLoading = false;
    state.network.totalCount = 0;
    state.network.hasMore = false;
    renderNetworkResults([], true);
    setNetworkSummary(`${t("networkSearchError")}: ${message}`);
    log(`${t("networkSearchError")}: ${message}`);
  }
}

async function loadMoreNetworkResults() {
  if (state.network.isLoading || state.network.isLoadingMore || !state.network.hasMore) return;
  state.network.isLoadingMore = true;
  renderNetworkResults([], false);

  try {
    const response = await fetchNetworkPage(state.network.page);
    const pagination = response?.pagination || {};
    const items = Array.isArray(response?.items) ? response.items : [];
    const total = Number(pagination.totalCount || state.network.totalCount || 0);
    if (total > 0) state.network.totalCount = total;
    state.network.page += 1;
    state.network.isLoadingMore = false;
    state.network.hasMore = items.length > 0 && state.network.items.length + items.length < state.network.totalCount;
    renderNetworkResults(items, false);
    if (!items.length) {
      state.network.hasMore = false;
      renderNetworkResults([], false);
    }
  } catch (error) {
    const message = friendlyNetworkError(error);
    state.network.isLoadingMore = false;
    state.network.hasMore = false;
    renderNetworkResults([], false);
    log(`${t("networkSearchError")}: ${message}`);
  }
}

async function installNetworkProject(project, options = {}) {
  const file = project?.file;
  if (!project?.id || !file?.id || !project.canInstall) {
    log(t("networkInstallUnsupported"));
    return;
  }

  const profileIds = Array.isArray(options.profileIds) && options.profileIds.length
    ? options.profileIds.map(String)
    : selectedNetworkProfileIds();
  if (!profileIds.length) {
    log(t("noUserSelected"));
    return;
  }

  try {
    if (options.targetVersion) log(`РЎРµС‚СЊ: СѓСЃС‚Р°РЅРѕРІРєР° РїРѕРґ ${options.targetVersion}`);
    log(t("networkDownloading"));
    const results = await window.mcApi.curseforgeInstall({
      root: state.root,
      modId: project.id,
      fileId: file.id,
      downloadUrl: file.downloadUrl || "",
      fileName: file.fileName || file.displayName || "curseforge.zip",
      profileIds,
      profiles: profilePayloadForIds(profileIds),
      targetVersion: options.targetVersion || "auto"
    });

    log(t("networkInstalling"));
    for (const result of Array.isArray(results) ? results : []) {
      if (result.kind === "world") {
        log(`${t("installedWorld")} "${result.name}" ${t("installedTo")} ${result.profile}. ${t("oldRemoved")}: ${result.removed}`);
      } else {
        log(`${result.type === "behavior" ? "BP" : "RP"} "${result.name}" ${t("installedTo")} ${result.profile}. ${t("oldRemoved")}: ${result.removed}`);
      }
    }

    log(`${t("networkInstalled")}: ${project.name}`);
    await scan();
    await refreshResources();
    await refreshWorlds();
    renderNetworkProfiles();
  } catch (error) {
    log(`${t("installError")}: ${error.message}`);
  }
}

async function downloadNetworkProject(project) {
  const file = project?.file;
  if (!project?.id || !file?.id || !project.canInstall) {
    log(t("networkInstallUnsupported"));
    return;
  }

  try {
    log(t("networkDownloading"));
    const result = await window.mcApi.curseforgeDownload({
      modId: project.id,
      fileId: file.id,
      downloadUrl: file.downloadUrl || "",
      fileName: file.fileName || file.displayName || "curseforge.zip"
    });
    if (result?.cancelled) {
      log(t("networkDownloadCancelled"));
      return;
    }
    log(`${t("networkDownloaded")}: ${result?.fileName || project.name}`);
  } catch (error) {
    log(`${t("networkSearchError")}: ${error.message}`);
  }
}

function setSelectedFile(file) {
  if (!file) return;
  $("filePath").value = file;
  state.file = file;
  const name = file.split(/[\\/]/).pop();
  const fileName = $("fileName");
  if (fileName) fileName.textContent = name || "вЂ”";
  const drop = $("dropZone");
  if (drop) {
    drop.classList.add("has-file");
    drop.dataset.fileName = name || "";
  }
}

function isSupportedInstallFile(filePath) {
  return /\.(mcpack|mcaddon|mcworld|zip)$/i.test(String(filePath || ""));
}

function setInstallStatus(message = "", kind = "") {
  const el = $("installStatus");
  if (!el) return;
  el.textContent = String(message || "");
  el.classList.remove("is-ok", "is-bad", "is-warn");
  if (kind) el.classList.add(kind);
}

async function installSelected(customProfilePath = null) {
  const file = $("filePath").value.trim();
  if (!file) {
    const msg = t("chooseFileFirst");
    setInstallStatus(msg, "is-warn");
    log(msg);
    return;
  }

  const profileIds = customProfilePath
    ? state.profiles.filter(p => p.path === customProfilePath).map(p => p.id)
    : state.profiles.map(p => p.id);

  if (profileIds.length === 0) {
    const msg = t("noUserSelected");
    setInstallStatus(msg, "is-warn");
    log(msg);
    return;
  }

  try {
    const btn = $("installBtn");
    if (btn) {
      btn.disabled = true;
      btn.dataset.prevText = btn.textContent || "";
      btn.textContent = t("installing");
    }
    setInstallStatus(`${t("installing")}вЂ¦`, "is-warn");
    log(`${t("installing")}: ${file} -> ${profileIds.length} profiles`);
    const results = await window.mcApi.install({
      root: state.root,
      file,
      profileIds,
      profiles: profilePayloadForIds(profileIds)
    });

    if (!Array.isArray(results) || results.length === 0) {
      const msg = `${t("installError")}: empty result`;
      setInstallStatus(msg, "is-bad");
      log(msg);
      return;
    }

    for (const r of results) {
      if (r.kind === "world") {
        log(`${t("installedWorld")} "${r.name}" ${t("installedTo")} ${r.profile}. ${t("oldRemoved")}: ${r.removed}`);
      } else {
        log(`${r.type === "behavior" ? "BP" : "RP"} "${r.name}" ${t("installedTo")} ${r.profile}. ${t("oldRemoved")}: ${r.removed}`);
      }
    }

    setInstallStatus(`${t("install")} OK вЂ” ${results.length} target(s)`, "is-ok");
    log(`${t("install")} OK вЂ” ${results.length} target(s)`);

    await scan();
    await refreshResources();
    await refreshWorlds();
  } catch (e) {
    const msg = `${t("installError")}: ${e.message}`;
    setInstallStatus(msg, "is-bad");
    log(msg);
  } finally {
    const btn = $("installBtn");
    if (btn) {
      btn.disabled = false;
      if (btn.dataset.prevText) btn.textContent = btn.dataset.prevText;
    }
  }
}

async function refreshResources() {
  const profilePath = $("resourceProfile").value;
  const list = $("resourcesList");
  list.innerHTML = "";

  if (!profilePath) {
    list.innerHTML = `<div class="item">${t("userNotSelected")}</div>`;
    return;
  }

  try {
    const resources = await window.mcApi.listResources(profilePath);
    if (resources.length === 0) {
      list.innerHTML = `<div class="item">${t("resourcesNotFound")}</div>`;
      return;
    }

    for (const r of resources) {
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `
        <div class="item-top">
          <div>
            <b>${escapeHtml(r.name)}</b>
            <div>
              <span class="badge">${escapeHtml(r.type)}</span>
              ${r.version ? `<span class="badge">v${escapeHtml(r.version)}</span>` : ""}
            </div>
          </div>
          <div class="actions">
            <button class="openBtn">${t("openFolder")}</button>
            <button class="danger deleteBtn">${t("delete")}</button>
          </div>
        </div>
        <div class="path">${escapeHtml(r.folder)}</div>
        ${r.uuid ? `<div class="path">UUID: ${escapeHtml(r.uuid)}</div>` : ""}
      `;

      item.querySelector(".openBtn").onclick = () => window.mcApi.openFolder(r.folder);
      item.querySelector(".deleteBtn").onclick = async () => {
        if (!confirm(`${t("deleteResourceConfirm")}\n\n${r.name}`)) return;
        try {
          await window.mcApi.deleteResource({ profilePath, folder: r.folder });
          log(`${t("deleted")}: ${r.name}`);
          await refreshResources();
        } catch (e) {
          log(`${t("deleteError")}: ${e.message}`);
        }
      };

      list.appendChild(item);
    }
  } catch (e) {
    log(`${t("resourcesError")}: ${e.message}`);
  }
}

async function refreshWorlds() {
  const profilePath = $("worldProfile").value;
  const list = $("worldsList");
  list.innerHTML = "";

  if (!profilePath) {
    list.innerHTML = `<div class="item">${t("userNotSelected")}</div>`;
    return;
  }

  try {
    const worlds = await window.mcApi.listWorlds(profilePath);
    if (worlds.length === 0) {
      list.innerHTML = `<div class="item">${t("worldsNotFound")}</div>`;
      return;
    }

    for (const w of worlds) {
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `
        <div class="item-top">
          <div>
            <b>${escapeHtml(w.name)}</b>
            <div><span class="badge">${fmtSize(w.size)}</span></div>
          </div>
          <div class="actions">
            <button class="openBtn">${t("openFolder")}</button>
            <button class="danger deleteBtn">${t("delete")}</button>
          </div>
        </div>
        <div class="path">${escapeHtml(w.folder)}</div>
      `;

      item.querySelector(".openBtn").onclick = () => window.mcApi.openFolder(w.folder);
      item.querySelector(".deleteBtn").onclick = async () => {
        if (!confirm(`${t("deleteWorldConfirm")}\n\n${w.name}`)) return;
        try {
          await window.mcApi.deleteWorld({ profilePath, folder: w.folder });
          log(`${t("worldDeleted")}: ${w.name}`);
          await refreshWorlds();
        } catch (e) {
          log(`${t("worldDeleteError")}: ${e.message}`);
        }
      };

      list.appendChild(item);
    }
  } catch (e) {
    log(`${t("worldsError")}: ${e.message}`);
  }
}

function setGameStatus(message) {
  const el = $("gameStatus");
  if (el) el.textContent = String(message || "");
}

function gameValidationKey(item) {
  const bucket = String(item?.bucket || "");
  const version = String(item?.version || item?.short || "").trim().toLowerCase();
  const firstUrl = String(Array.isArray(item?.urls) ? item.urls[0] || "" : "").trim().toLowerCase();
  return `${bucket}|${version}|${firstUrl}`;
}

function catalogStatusForItem(item) {
  const bucket = String(item?.bucket || "");
  const key = gameValidationKey(item);
  const cache = state.game.validationCache?.items && typeof state.game.validationCache.items === "object"
    ? state.game.validationCache.items
    : {};
  const archive = state.game.validationArchive?.items && typeof state.game.validationArchive.items === "object"
    ? state.game.validationArchive.items
    : {};
  const record = cache[key];
  if (bucket === "legacy" && archive[key]) return { kind: "bad", label: "РЅРµСЂР°Р±РѕС‡Р°СЏ" };
  if (record?.valid === true) return { kind: "ok", label: "СЂР°Р±РѕС‡Р°СЏ" };
  if (record?.hardInvalid === true) return { kind: "bad", label: "РЅРµСЂР°Р±РѕС‡Р°СЏ" };
  return { kind: "warn", label: "РЅРµ РїСЂРѕРІРµСЂРµРЅР°" };
}

function flattenGameCatalog() {
  const catalog = state.game.catalog || {};
  return [
    ...(Array.isArray(catalog.releaseVersions) ? catalog.releaseVersions.map(item => ({ ...item, bucket: "release" })) : []),
    ...(Array.isArray(catalog.previewVersions) ? catalog.previewVersions.map(item => ({ ...item, bucket: "preview" })) : []),
    ...(Array.isArray(catalog.legacyUwpVersions) ? catalog.legacyUwpVersions.map(item => ({ ...item, bucket: "legacy" })) : [])
  ];
}

function gameTypeLabel(bucket) {
  if (bucket === "preview") return t("gamePreview");
  if (bucket === "legacy") return t("gameLegacy");
  return t("gameRelease");
}

function filteredGameCatalog() {
  const query = String(state.game.query || "").trim().toLowerCase();
  const filter = state.game.filter || "all";
  return flattenGameCatalog().filter(item => {
    const matchesType = filter === "all" || item.bucket === filter;
    if (!matchesType) return false;
    if (!query) return true;
    const haystack = [
      item.version,
      item.short,
      item.package,
      item.source,
      Array.isArray(item.urls) ? item.urls.join(" ") : ""
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

function installedGameLookup() {
  const map = new Map();
  for (const item of Array.isArray(state.game.installed) ? state.game.installed : []) {
    const version = String(item.version || "").trim().toLowerCase();
    if (version) map.set(version, item);
  }
  return map;
}

function renderGameCatalog() {
  const box = $("gameCatalogList");
  const summary = $("gameCatalogSummary");
  if (!box) return;

  const allItems = flattenGameCatalog();
  const items = filteredGameCatalog();
  const installed = installedGameLookup();
  box.innerHTML = "";
  if (summary) summary.textContent = items.length === allItems.length ? String(items.length) : `${items.length}/${allItems.length}`;

  if (!items.length) {
    box.innerHTML = `<div class="game-empty">${t("gameNoVersions")}</div>`;
    return;
  }

  for (const item of items) {
    const version = String(item.version || item.short || "Bedrock").trim();
    const packageType = String(item.package || (item.bucket === "legacy" ? "uwp" : "gdk")).toUpperCase();
    const alreadyInstalled = installed.get(version.toLowerCase());
    const status = catalogStatusForItem(item);
    const row = document.createElement("article");
    row.className = "game-card";
    const source = String(item.source || "").replace(/^https?:\/\//i, "").split("/")[0] || "catalog";
    row.innerHTML = `
      <div class="game-card-main">
        <div>
          <b>${escapeHtml(version)}</b>
          <div class="game-card-meta">
            <span>${escapeHtml(gameTypeLabel(item.bucket))}</span>
            <span>${escapeHtml(packageType)}</span>
            <span>${escapeHtml(source)}</span>
            <span class="badge ${status.kind === "ok" ? "ok" : status.kind === "bad" ? "danger" : "warn"}">${escapeHtml(status.label)}</span>
          </div>
        </div>
      </div>
      <div class="game-card-actions">
        <button class="game-install-btn" ${state.game.installing || status.kind === "bad" ? "disabled" : ""}>
          ${alreadyInstalled ? t("gameInstallVersion") : t("gameInstallVersion")}
        </button>
      </div>
    `;

    row.querySelector(".game-install-btn")?.addEventListener("click", () => installGameVersion(item));
    box.appendChild(row);
  }
}

function renderInstalledGameVersions() {
  const box = $("gameInstalledList");
  const summary = $("gameInstalledSummary");
  if (!box) return;

  const items = Array.isArray(state.game.installed) ? state.game.installed : [];
  box.innerHTML = "";
  if (summary) summary.textContent = String(items.length);

  if (!items.length) {
    box.innerHTML = `<div class="game-empty">${t("gameNoInstalled")}</div>`;
    return;
  }

  for (const item of items) {
    const row = document.createElement("article");
    row.className = "game-card installed-card";
    const packageType = String(item.package || "unknown").toUpperCase();
    row.innerHTML = `
      <div class="game-card-main">
        <div>
          <b>${escapeHtml(item.version || item.name || "Bedrock")}</b>
          <div class="game-card-meta">
            <span>${escapeHtml(String(item.type || "release"))}</span>
            <span>${escapeHtml(packageType)}</span>
            <span>${escapeHtml(item.installMethod || "")}</span>
          </div>
        </div>
      </div>
      <div class="game-card-actions">
        <button class="game-launch-btn" ${state.game.launching ? "disabled" : ""}>${state.game.launching && String(state.game.launchingName || "") === String(item.name || item.version || "") ? "Р—Р°РїСѓСЃРєвЂ¦" : t("gameLaunch")}</button>
        ${item.systemInstalled ? "" : `<button class="game-delete-btn danger" ${state.game.launching ? "disabled" : ""}>${t("gameDelete")}</button>`}
      </div>
    `;
    row.querySelector(".game-launch-btn")?.addEventListener("click", () => launchGameVersion(item.name || item.version));
    row.querySelector(".game-delete-btn")?.addEventListener("click", () => deleteGameVersion(item.name || item.version, item.version || item.name || "Bedrock"));
    box.appendChild(row);
  }
}

async function loadInstalledGameVersions() {
  try {
    state.game.installed = await window.mcApi.gameInstalled();
  } catch (error) {
    state.game.installed = [];
    log(`${t("gameCatalogError")}: ${String(error?.message || error)}`);
  }
  renderInstalledGameVersions();
  renderGameCatalog();
}

async function loadGameCatalog(force = false) {
  if (state.game.loading) return;
  state.game.loading = true;
  setGameStatus(t("gameLoadingCatalog"));
  try {
    if (force) {
      state.game.hiddenVersionKeys = {};
    }
    const response = force
      ? await window.mcApi.gameCatalogRefresh()
      : await window.mcApi.gameCatalog({ force: false });
    const catalog = response?.catalog || response?.rawCatalog || response || {};
    state.game.catalog = catalog;
    state.game.validationCache = response?.cache || state.game.validationCache || null;
    state.game.validationArchive = response?.archive || state.game.validationArchive || null;
    state.game.loaded = true;
    state.game.validationReloadedAt = Date.now();
    const total = flattenGameCatalog().length;
    setGameStatus(`${t("gameAvailableVersions")}: ${total}`);
    renderGameCatalog();
    renderNetworkInstallVersions();
  } catch (error) {
    state.game.catalog = null;
    state.game.loaded = false;
    const message = String(error?.message || error);
    setGameStatus(`${t("gameCatalogError")}: ${message}`);
    log(`${t("gameCatalogError")}: ${message}`);
    renderGameCatalog();
  } finally {
    state.game.loading = false;
  }
}

async function initializeGameView() {
  await loadInstalledGameVersions();
  if (!state.game.loaded) await loadGameCatalog(true);
  else renderGameCatalog();
}

function updateGameProgress(payload = {}) {
  state.game.lastProgress = payload || null;
  const total = Number(payload.total || 0);
  const downloaded = Number(payload.downloaded || 0);
  const percent = total > 0 ? Math.min(100, Math.max(0, Math.round((downloaded / total) * 100))) : 0;
  const bar = $("gameProgressBar");
  const text = $("gameProgressText");
  if (bar) bar.style.width = total > 0 ? `${percent}%` : "0%";
  if (text) {
    text.textContent = total > 0
      ? `${fmtSize(downloaded)} / ${fmtSize(total)} В· ${percent}%`
      : downloaded > 0 ? `${fmtSize(downloaded)} ${t("gameDownloaded")}` : "вЂ”";
  }
}

function handleGameInstallStatus(payload = {}) {
  const message = String(payload.message || "").trim();
  if (message) setGameStatus(message);
  if (payload.stage === "done") {
    state.game.installing = false;
    updateGameProgress({ downloaded: 0, total: 0 });
    loadInstalledGameVersions();
  }
}

function handleGameCatalogValidationProgress(payload = {}) {
  const stage = String(payload.stage || "");
  const completed = Number(payload.completed || 0);
  const total = Number(payload.total || 0);
  const percent = Number(payload.percent || 0);
  const valid = Number(payload.valid || 0);
  const invalid = Number(payload.invalid || 0);

  if (stage === "cached") {
    state.game.validating = false;
    return;
  }

  if (stage === "done") {
    state.game.validating = false;
    setGameStatus(`РџСЂРѕРІРµСЂРєР° РІРµСЂСЃРёР№ Р·Р°РІРµСЂС€РµРЅР°${total ? `: ${valid}/${total}` : ""}`);
    renderGameCatalog();
    return;
  }

  if (stage === "fallback") {
    state.game.validating = false;
    const error = payload.error ? `: ${payload.error}` : "";
    setGameStatus(`Р¤РѕРЅРѕРІР°СЏ РїСЂРѕРІРµСЂРєР° РІРµСЂСЃРёР№ РЅРµ Р·Р°РІРµСЂС€РёР»Р°СЃСЊ${error}`);
    return;
  }

  if (payload.remove && payload.currentKey) {
    // Validation is informational only; do not hide catalog entries.
    renderGameCatalog();
  }

  state.game.validating = true;
  if (total > 0) {
    setGameStatus(`Р¤РѕРЅРѕРІР°СЏ РїСЂРѕРІРµСЂРєР° РІРµСЂСЃРёР№: ${completed}/${total} вЂў ${percent || 0}% вЂў ok ${valid} вЂў bad ${invalid}`);
  } else {
    setGameStatus("Р¤РѕРЅРѕРІР°СЏ РїСЂРѕРІРµСЂРєР° РІРµСЂСЃРёР№...");
  }
}

async function installGameVersion(item) {
  if (!item || state.game.installing) return;
  state.game.installing = true;
  renderGameCatalog();
  updateGameProgress({ downloaded: 0, total: 0 });
  const label = String(item.version || item.short || "Bedrock");
  setGameStatus(`${t("gameInstallStarted")}: ${label}`);
  log(`${t("gameInstallStarted")}: ${label}`);

  try {
    await window.mcApi.gameInstall({ version: item });
    log(`${t("gameInstallDone")}: ${label}`);
    await loadInstalledGameVersions();
  } catch (error) {
    const message = String(error?.message || error);
    state.game.installing = false;
    setGameStatus(`${t("gameInstallError")}: ${message}`);
    log(`${t("gameInstallError")}: ${message}`);
    renderGameCatalog();
  }
}

function showGameLaunchOverlay(title, message, tone = "loading", autoHideMs = 0) {
  const overlay = $("gameLaunchOverlay");
  const titleEl = $("gameLaunchOverlayTitle");
  const messageEl = $("gameLaunchOverlayText");
  if (!overlay) return;
  if (state.game.launchOverlayTimer) {
    clearTimeout(state.game.launchOverlayTimer);
    state.game.launchOverlayTimer = null;
  }
  overlay.classList.remove("hidden", "success", "error");
  if (tone === "success") overlay.classList.add("success");
  if (tone === "error") overlay.classList.add("error");
  if (titleEl) titleEl.textContent = String(title || "Р—Р°РїСѓСЃРєР°РµРј РёРіСЂСѓвЂ¦");
  if (messageEl) messageEl.textContent = String(message || "РџРѕРґРіРѕС‚Р°РІР»РёРІР°СЋ Minecraft.");
  if (autoHideMs > 0) {
    state.game.launchOverlayTimer = setTimeout(() => {
      overlay.classList.add("hidden");
      overlay.classList.remove("success", "error");
      state.game.launchOverlayTimer = null;
    }, autoHideMs);
  }
}

function hideGameLaunchOverlay() {
  const overlay = $("gameLaunchOverlay");
  if (!overlay) return;
  if (state.game.launchOverlayTimer) {
    clearTimeout(state.game.launchOverlayTimer);
    state.game.launchOverlayTimer = null;
  }
  overlay.classList.add("hidden");
  overlay.classList.remove("success", "error");
}

function handleGameLaunchStatus(payload = {}) {
  const stage = String(payload.stage || "");
  const title = String(payload.title || "").trim();
  const message = String(payload.message || "").trim();
  if (message) setGameStatus(message);

  if (stage === "launched" || stage === "focused-existing" || stage === "launch-pending") {
    state.game.launching = false;
    state.game.launchingName = "";
    renderInstalledGameVersions();
    showGameLaunchOverlay(
      title || (stage === "launch-pending" ? "РљРѕРјР°РЅРґР° Р·Р°РїСѓСЃРєР° РїРµСЂРµРґР°РЅР°" : "РРіСЂР° Р·Р°РїСѓС‰РµРЅР° РєРѕСЂСЂРµРєС‚РЅРѕ"),
      message || (stage === "launch-pending" ? "Windows РїСЂРёРЅСЏР»Р° Р·Р°РїСѓСЃРє Minecraft. Falon Р±РѕР»СЊС€Рµ РЅРµ Р¶РґС‘С‚ Р±РµСЃРєРѕРЅРµС‡РЅРѕ." : "РћРєРЅРѕ Minecraft РІС‹РІРµРґРµРЅРѕ РЅР° СЌРєСЂР°РЅ."),
      "success",
      stage === "launch-pending" ? 4200 : 2600
    );
    return;
  }

  if (stage === "error") {
    state.game.launching = false;
    state.game.launchingName = "";
    renderInstalledGameVersions();
    showGameLaunchOverlay(title || "Р—Р°РїСѓСЃРє РЅРµ Р·Р°РІРµСЂС€С‘РЅ", message || "Minecraft РЅРµ РѕС‚РєСЂС‹Р» РѕРєРЅРѕ.", "error", 5200);
    return;
  }

  if (stage) {
    showGameLaunchOverlay(title || "Р—Р°РїСѓСЃРєР°РµРј РёРіСЂСѓвЂ¦", message || "РџРѕРґРіРѕС‚Р°РІР»РёРІР°СЋ Minecraft.");
  }
}

async function launchGameVersion(name) {
  if (!name || state.game.launching) return;
  state.game.launching = true;
  state.game.launchingName = String(name || "");
  renderInstalledGameVersions();
  const label = String(name || "Bedrock");
  setGameStatus(`Р—Р°РїСѓСЃРєР°РµРј РёРіСЂСѓ: ${label}`);
  showGameLaunchOverlay("Р—Р°РїСѓСЃРєР°РµРј РёРіСЂСѓвЂ¦", "РџРѕРґРіРѕС‚Р°РІР»РёРІР°СЋ Minecraft Рё Р¶РґСѓ РѕРєРЅРѕ РёРіСЂС‹.");

  try {
    const result = await window.mcApi.gameLaunch(name);
    const message = String(result?.message || "").trim();
    if (state.game.launching) {
      state.game.launching = false;
      state.game.launchingName = "";
      renderInstalledGameVersions();
      showGameLaunchOverlay("РРіСЂР° Р·Р°РїСѓС‰РµРЅР° РєРѕСЂСЂРµРєС‚РЅРѕ", message || "РћРєРЅРѕ Minecraft РІС‹РІРµРґРµРЅРѕ РЅР° СЌРєСЂР°РЅ.", "success", 2600);
    }
    log(`${t("gameLaunch")}: ${name}`);
  } catch (error) {
    const message = String(error?.message || error);
    state.game.launching = false;
    state.game.launchingName = "";
    renderInstalledGameVersions();
    setGameStatus(`${t("gameLaunchError")}: ${message}`);
    log(`${t("gameLaunchError")}: ${message}`);
    showGameLaunchOverlay("Р—Р°РїСѓСЃРє РЅРµ Р·Р°РІРµСЂС€С‘РЅ", message, "error", 6200);
  }
}

async function deleteGameVersion(name, label = name) {
  const title = String(label || name || "Bedrock");
  if (!confirm(`${t("gameDeleteConfirm")}\n\n${title}`)) return;
  try {
    await window.mcApi.gameDelete(name);
    setGameStatus(`${t("gameDeleteDone")}: ${title}`);
    log(`${t("gameDeleteDone")}: ${title}`);
    await loadInstalledGameVersions();
  } catch (error) {
    const message = String(error?.message || error);
    setGameStatus(`${t("gameDeleteError")}: ${message}`);
    log(`${t("gameDeleteError")}: ${message}`);
  }
}

addEventListener("DOMContentLoaded", async () => {
  syncLangSelectors();
  applyLanguage();
  await loadDefaultRoot();
  setView("home");

  updateClock();
  setInterval(updateClock, 1000);

  window.mcApi.onCreatorLiveStarted?.((payload) => {
    showCreatorLiveToast(payload || {});
  });

  $("langSelectLogin").onchange = (e) => setLanguage(e.target.value);
  $("langSelectApp").onchange = (e) => setLanguage(e.target.value);

  $("loginBtn").onclick = login;
  $("launcherIconBtn").onclick = pickLauncherIcon;
  $("exitBtnLogin").onclick = () => window.mcApi.closeApp();
  $("buyKeyBtn").onclick = openBuyModal;
  $("freeKeyBtn").onclick = openFreeKeyModal;
  $("closeBuyModal").onclick = closeBuyModal;
  $("closeCheckoutModal").onclick = closeCheckoutModal;
  $("checkoutCancelBtn").onclick = closeCheckoutModal;
  $("checkoutConfirmBtn").onclick = confirmCheckout;
  document.querySelectorAll(".payment-tab").forEach((btn) => btn.onclick = () => setBuyMethod(btn.dataset.payMethod));
  $("currencySelect").onchange = (e) => setBuyCurrency(e.target.value);
  $("starsPlanSelect").onchange = (e) => setBuyStarPlan(e.target.value);
  $("coinsPlanSelect").onchange = (e) => setBuyCoinPlan(e.target.value);
  $("checkoutModal").addEventListener("click", (e) => { if (e.target.id === "checkoutModal") closeCheckoutModal(); });
  $("windowColorBtn").onclick = openWindowColorModal;
  $("closeWindowColorModal").onclick = closeWindowColorModal;
  $("windowColorDone").onclick = closeWindowColorModal;
  $("windowColorReset").onclick = resetWindowColor;
  $("windowColorPrimary").oninput = (e) => setWindowColor("primary", e.target.value);
  $("windowColorSecondary").oninput = (e) => setWindowColor("secondary", e.target.value);
  $("windowColorGradient").onchange = (e) => setWindowColorGradient(e.target.checked);
  $("windowColorModal").addEventListener("click", (e) => { if (e.target.id === "windowColorModal") closeWindowColorModal(); });
  $("closeFreeKeyModal").onclick = closeFreeKeyModal;
  if ($("openCreatorXboxBtn")) $("openCreatorXboxBtn").onclick = openCreatorXboxProfile;
  $("generateFreeTrialBtn").onclick = generateFreeTrialKey;
  $("ackFreeKeyModal").onclick = closeFreeKeyModal;
  $("freeKeyModal").addEventListener("click", (e) => { if (e.target.id === "freeKeyModal") closeFreeKeyModal(); });
  $("closeCreatorLiveToast").onclick = closeCreatorLiveToast;
  $("openCreatorLiveBtn").onclick = openCreatorLiveStream;
  $("checkoutBtn").onclick = goCheckout;
  $("buyModal").addEventListener("click", (e) => { if (e.target.id === "buyModal") closeBuyModal(); });

  $("accessKey").addEventListener("keydown", e => {
    if (e.key === "Enter") login();
  });

  $("logoutBtn").onclick = logout;
  $("wallpaperBtnLogin").onclick = pickWallpaper;
  $("wallpaperBtnApp").onclick = pickWallpaper;
  $("uiShapeToggleBtn").onclick = toggleUiShape;
  $("blurToggleBtn").onclick = toggleBackgroundBlur;

  document.querySelectorAll(".hub-btn, .menu-btn").forEach(b => {
    b.addEventListener("click", () => setView(b.dataset.view));
  });
  $("homeBtn").onclick = () => setView("home");

  $("scanBtn").onclick = scan;
  $("logoutBtn").onclick = logout;

  $("pickRootBtn").onclick = async () => {
    const currentPath = String($("rootPath")?.value || "").trim();
    if (currentPath) {
      try {
        await window.mcApi.openFolder(currentPath);
        return;
      } catch (error) {
        log(`Path: ${String(error?.message || error)}`);
      }
    }

    const folder = await window.mcApi.pickRoot();
    if (folder) {
      $("rootPath").value = folder;
      await scan();
    }
  };

  $("rootPath").addEventListener("keydown", async (e) => {
    if (e.key === "Enter") await scan();
  });

  $("pickFileBtn").onclick = async () => {
    const file = await window.mcApi.pickFile();
    if (file) setSelectedFile(file);
  };

  $("selectAllProfiles").onclick = () => document.querySelectorAll(".profileCheck").forEach(e => e.checked = true);
  $("selectNoProfiles").onclick = () => document.querySelectorAll(".profileCheck").forEach(e => e.checked = false);
  $("installBtn").onclick = () => installSelected();

  if ($("networkView")) {
    $("networkSearchBtn").onclick = () => searchNetwork(true);
    $("networkSaveApiKey").onclick = () => saveNetworkSettings();
    $("networkApiKey").addEventListener("keydown", (event) => {
      if (event.key === "Enter") saveNetworkSettings();
    });
    $("networkSearch").addEventListener("keydown", (event) => {
      if (event.key === "Enter") searchNetwork(true);
    });
    $("networkSort").onchange = () => searchNetwork(true);
    $("closeNetworkDetails").onclick = () => closeNetworkDetails();
    $("networkDetailsModal").addEventListener("click", (event) => {
      if (event.target === $("networkDetailsModal")) closeNetworkDetails();
    });
    $("closeNetworkInstall").onclick = () => closeNetworkInstallModal();
    $("networkInstallCancel").onclick = () => closeNetworkInstallModal();
    $("networkInstallConfirm").onclick = () => confirmNetworkInstallModal();
    $("networkInstallModal").addEventListener("click", (event) => {
      if (event.target === $("networkInstallModal")) closeNetworkInstallModal();
    });
    $("networkSelectAllProfiles").onclick = () => {
      state.network.selectedProfiles = new Set(state.profiles.map(profile => String(profile.id)));
      renderNetworkProfiles();
      renderNetworkInstallProfiles();
    };
    $("networkSelectNoProfiles").onclick = () => {
      state.network.selectedProfiles = new Set();
      state.network.searchedOnce = true;
      renderNetworkProfiles();
      renderNetworkInstallProfiles();
    };
  }

  $("gameRefreshBtn").onclick = () => loadGameCatalog(true);
  $("gameSearch").addEventListener("input", (event) => {
    state.game.query = event.target.value || "";
    renderGameCatalog();
  });
  $("gameTypeFilter").onchange = (event) => {
    state.game.filter = event.target.value || "all";
    localStorage.setItem("falon_game_filter", state.game.filter);
    renderGameCatalog();
  };
  $("gameOpenVersionsBtn").onclick = () => window.mcApi.gameOpenVersionsFolder();
  $("gameOpenInstallersBtn").onclick = () => window.mcApi.gameOpenInstallersFolder();
  window.mcApi.onGameDownloadProgress(updateGameProgress);
  window.mcApi.onGameInstallStatus(handleGameInstallStatus);
  if (window.mcApi.onGameLaunchStatus) {
    window.mcApi.onGameLaunchStatus(handleGameLaunchStatus);
  }
  if (window.mcApi.onGameCatalogValidationProgress) {
    window.mcApi.onGameCatalogValidationProgress(handleGameCatalogValidationProgress);
  }

  $("resourceProfile").onchange = refreshResources;
  $("worldProfile").onchange = refreshWorlds;

  $("installWorldBtn").onclick = async () => {
    const file = await window.mcApi.pickFile();
    if (!file) return;
    setSelectedFile(file);
    await installSelected($("worldProfile").value);
  };

  const drop = $("dropZone");

  // Keep the browser/Electron shell from trying to open dropped files itself.
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => e.preventDefault());

  drop.addEventListener("click", () => $("pickFileBtn").click());

  drop.addEventListener("dragenter", (e) => {
    e.preventDefault();
    drop.classList.add("drag");
  });

  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    drop.classList.add("drag");
  });

  drop.addEventListener("dragleave", (e) => {
    if (!drop.contains(e.relatedTarget)) drop.classList.remove("drag");
  });

  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("drag");

    const dropped = e.dataTransfer.files?.[0];
    let file = "";
    try {
      file = dropped ? window.mcApi.getDroppedFilePath(dropped) : "";
    } catch {}

    if (!file) {
      log(t("dropPathError"));
      return;
    }

    if (!isSupportedInstallFile(file)) {
      log(t("dropUnsupported"));
      return;
    }

    setSelectedFile(file);
  });

  applyBackgroundBlur(state.backgroundBlur, false);
  applyUiShape(state.uiSquare, false);
  applyWindowColor(false);
  const gameFilterSelect = $("gameTypeFilter");
  if (gameFilterSelect) gameFilterSelect.value = state.game.filter;
  await loadSavedWallpaper();
  loadSavedLauncherIcon();

  // Always start on the access-key screen. If the user had a valid key before,
  // keep it prefilled so they only need to confirm it again.
  localStorage.removeItem("mc_access_session");
  prefillSavedAccessKey();
  try {
    const license = await window.mcApi.licenseStatus();
    if (license?.deviceMismatch) $("loginError").textContent = t("keyDeviceMismatch");
    else if (license?.expired) $("loginError").textContent = t("keyExpired");
  } catch {}
  $("accessKey").focus();
});

