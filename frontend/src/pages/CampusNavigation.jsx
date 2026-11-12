import React from "react";
import { CheckCircle2 } from "lucide-react";
import { useSettings } from "../context/settingsContext/SettingsContext";
import SmartIndoorNavigation from "../navigation/SmartIndoorNavigation";

export default function CampusNavigation() {
  const { t } = useSettings();

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("campusNavigation")}</p>
          <h1>{t("navigateCampus")}</h1>
          <p className="muted">{t("campusNavigationDescription")}</p>
        </div>

        <span className="profile-saved">
          <CheckCircle2 size={16} />
          {t("locationReady")}
        </span>
      </div>

      <SmartIndoorNavigation />
    </section>
  );
}
