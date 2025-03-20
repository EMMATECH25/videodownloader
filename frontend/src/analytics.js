import ReactGA from "react-ga4";
// Replace with your actual Measurement ID
const GA_MEASUREMENT_ID = "G-J84LVWRTMK";
export const initGA = () => {
    ReactGA.initialize(GA_MEASUREMENT_ID);
};
export const trackPageView = (page) => {
    ReactGA.send({ hitType: "pageview", page });
};
export const trackEvent = (action, category, label) => {
    ReactGA.event({ category, action, label });
};
