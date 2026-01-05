import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";

class ChartJsRegistry {
  private registered = false;

  ensureRegistered() {
    if (this.registered) return;

    ChartJS.register(ArcElement, Tooltip, Legend);

    ChartJS.defaults.animation = {
      duration: 900,
      easing: "easeOutQuart",
    };
    ChartJS.defaults.responsive = true;
    ChartJS.defaults.maintainAspectRatio = false;

    this.registered = true;
  }
}

const registry = new ChartJsRegistry();

export function ensureChartJsRegistered() {
  registry.ensureRegistered();
}
