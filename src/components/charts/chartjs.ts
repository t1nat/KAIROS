import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from "chart.js";

class ChartJsRegistry {
  private registered = false;

  ensureRegistered() {
    if (this.registered) return;

    ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

    // Disable animations to prevent potential callback errors
    ChartJS.defaults.animation = false;
    ChartJS.defaults.responsive = true;
    ChartJS.defaults.maintainAspectRatio = true;

    this.registered = true;
  }
}

const registry = new ChartJsRegistry();

export function ensureChartJsRegistered() {
  registry.ensureRegistered();
}
