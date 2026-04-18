import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { defaultSiteSettings, mergeSiteSettings, type SiteSettings } from "../shared/siteSettings.js";

interface SiteSettingsContextValue {
    loading: boolean;
    siteSettings: SiteSettings;
    reloadSiteSettings: () => Promise<SiteSettings>;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | undefined>(undefined);

const cssVariableMap: Record<string, string> = {
    "--primary-color": "primaryColor",
    "--secondary-color": "secondaryColor",
    "--sixth-color": "accentColor",
    "--eighth-color": "buttonColor",
    "--seventh-color": "darkBackgroundColor",
    "--fourth-color": "highlightColor",
};

async function fetchSiteSettings(): Promise<SiteSettings> {
    try {
        const response = await fetch("/api/public/settings");
        if (!response.ok) {
            throw new Error(`Failed to load settings: ${response.status}`);
        }

        const payload = await response.json() as Partial<SiteSettings>;
        return mergeSiteSettings(payload);
    } catch {
        return { ...defaultSiteSettings };
    }
}

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
    const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSiteSettings);
    const [loading, setLoading] = useState(true);

    const reloadSiteSettings = useCallback(async () => {
        const nextSettings = await fetchSiteSettings();
        setSiteSettings(nextSettings);
        setLoading(false);
        return nextSettings;
    }, []);

    useEffect(() => {
        void reloadSiteSettings();
    }, [reloadSiteSettings]);

    useEffect(() => {
        const rootStyle = document.documentElement.style;

        for (const [cssVariable, siteSettingKey] of Object.entries(cssVariableMap)) {
            const value = siteSettings[siteSettingKey as keyof SiteSettings];
            if (typeof value === "string" && value.length > 0) {
                rootStyle.setProperty(cssVariable, value);
            }
        }
    }, [siteSettings]);

    const value = useMemo<SiteSettingsContextValue>(() => ({
        loading,
        siteSettings,
        reloadSiteSettings,
    }), [loading, reloadSiteSettings, siteSettings]);

    return (
        <SiteSettingsContext.Provider value={value}>
            {children}
        </SiteSettingsContext.Provider>
    );
}

export function useSiteSettings(): SiteSettingsContextValue {
    const context = useContext(SiteSettingsContext);
    if (!context) {
        throw new Error("useSiteSettings must be used inside SiteSettingsProvider.");
    }

    return context;
}
