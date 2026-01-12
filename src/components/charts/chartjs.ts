import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";

class ChartJsRegistry {
  private registered = false;

  ensureRegistered() {
    if (this.registered) return;

    ChartJS.register(ArcElement, Tooltip, Legend);

    ChartJS.defaults.animation = {
      duration: 800,
      easing: "easeInOutQuart",
    };
    ChartJS.defaults.responsive = true;
    ChartJS.defaults.maintainAspectRatio = true;

    this.registered = true;
  }
}

const registry = new ChartJsRegistry();

export function ensureChartJsRegistered() {
  registry.ensureRegistered();
}
