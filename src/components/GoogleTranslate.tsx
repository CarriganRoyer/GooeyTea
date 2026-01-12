import { useEffect } from "react";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
  }
}

// this function sets up the translation and the formatting of the language selector
export default function GoogleTranslate() {
  useEffect(() => {
    window.googleTranslateElementInit = () => {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            layout: window.google.translate.TranslateElement.InlineLayout.VERTICAL,
          },
          "google_translate_element"
        );
      }
    };

    // for preventing multiple scripts being loaded
    const existingScript = document.getElementById("google-translate-script");
    if (existingScript) return;

    // the script to be used for translating
    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;

    script.onerror = () => {
      console.error("Google Translate script failed to load");
    };

    document.body.appendChild(script);
  }, []);

  // formatting for language dropdown
  return (
    <div
      id="google_translate_element"
      style={{
        zIndex: 9999,
        position: "relative",
        display: "inline-block",
        background: "white",
        padding: "0",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    ></div>
  );
}
