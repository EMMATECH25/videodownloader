import ReactGA from "react-ga4";

// Replace with your actual Measurement ID
const GA_MEASUREMENT_ID = "G-J84LVWRTMK";

export const initGA = () => {
  ReactGA.initialize(GA_MEASUREMENT_ID);
};

export const trackPageView = (page: string) => {
  ReactGA.send({ hitType: "pageview", page });
};

export const trackEvent = (action: string, category: string, label?: string) => {
  ReactGA.event({ category, action, label });
};
