import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";

let registered = false;

export function ensureChartJsRegistered() {
  if (registered) return;

  ChartJS.register(ArcElement, Tooltip, Legend);

  ChartJS.defaults.animation = {
    duration: 900,
    easing: "easeOutQuart",
  };
  ChartJS.defaults.responsive = true;
  ChartJS.defaults.maintainAspectRatio = false;

  registered = true;
}
