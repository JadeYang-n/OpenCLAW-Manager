import { useLanguageStore } from '../stores/languageStore'

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguageStore()

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setLanguage('zh')}
        className={`px-3 py-1 text-sm rounded transition-colors ${
          language === 'zh'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        中文
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 text-sm rounded transition-colors ${
          language === 'en'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        EN
      </button>
    </div>
  )
}
