import { createInstance } from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"

import enCommon from "./locales/en/common.json"
import enDetailProject from "./locales/en/detailProject.json"
import enEditProject from "./locales/en/editProject.json"
import enHome from "./locales/en/home.json"
import enStatus from "./locales/en/status.json"
import jaCommon from "./locales/ja/common.json"
import jaDetailProject from "./locales/ja/detailProject.json"
import jaEditProject from "./locales/ja/editProject.json"
import jaHome from "./locales/ja/home.json"
import jaStatus from "./locales/ja/status.json"

const i18n = createInstance()

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ["ja", "en"],
    fallbackLng: "ja",
    defaultNS: "common",
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
    resources: {
      ja: {
        common: jaCommon,
        home: jaHome,
        editProject: jaEditProject,
        detailProject: jaDetailProject,
        status: jaStatus,
      },
      en: {
        common: enCommon,
        home: enHome,
        editProject: enEditProject,
        detailProject: enDetailProject,
        status: enStatus,
      },
    },
    interpolation: {
      escapeValue: false, // React handles XSS
    },
  })

export default i18n
