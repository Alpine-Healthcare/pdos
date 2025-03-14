import Module from "../Module";
import { Core } from "../..";

interface Config {}

type DependencyInjection = {
  reactNativeHealthKit: any;
};

const convertCamelCaseToSnakeCase = (str: string) => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

export default class DataRequest extends Module {
  private HealthKit: any;
  private reactNativeHealthKit: any;

  private MetricMap: any = {};

  constructor(
    core: Core,
    private config: Config,
    private dependencyInjection: DependencyInjection,
  ) {
    super(core);
    this.reactNativeHealthKit = dependencyInjection.reactNativeHealthKit;
    this.HealthKit = this.reactNativeHealthKit.default;

    // Load the MetricMap with the keys from the reactNativeHealthKit.HKQuantityTypeIdentifier object
    Object.keys(this.reactNativeHealthKit.HKQuantityTypeIdentifier).forEach(
      (key) => {
        const pascalCaseKey = convertCamelCaseToSnakeCase(key);
        this.MetricMap[pascalCaseKey] =
          this.reactNativeHealthKit.HKQuantityTypeIdentifier[key];
      },
    );
  }

  protected async start(): Promise<void> {
    const isAvailable =
      await this.reactNativeHealthKit.default.isHealthDataAvailable();

    if (!isAvailable) {
      console.error("Healthkit is not available on this device");
    }
  }

  public async checkAccess(metrics: any[]): Promise<void> {
    try {
      if (metrics.length === 0) {
        return;
      }

      await this.HealthKit.requestAuthorization(
        metrics.map((metric) => this.MetricMap[metric]),
      );
    } catch (e) {
      console.error("Error in getting access to metrics");
    }
  }

  public async getTodaysValue(metric: string): Promise<number | undefined> {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      const response = await this.HealthKit.queryQuantitySamples(
        this.MetricMap[metric],
        {
          from: startOfDay,
          to: endOfDay,
        },
      );

      if (response.length === 0) {
        return 0;
      }

      // For cumulative metrics like steps, we might want to sum all samples
      if (this.isCumulativeMetric(metric)) {
        return response.reduce(
          (sum: any, sample: any) => sum + sample.quantity,
          0,
        );
      } else {
        // For metrics like weight, latest value might be more appropriate
        return response[0].quantity;
      }
    } catch (error) {
      console.error(`Error fetching ${metric}:`, error);
      return undefined;
    }
  }

  private isCumulativeMetric(metric: string): boolean {
    // Add metrics that accumulate throughout the day
    const cumulativeMetrics = [
      "step_count",
      "distance_walking_running",
      "active_energy_burned",
      // Add other cumulative metrics as needed
    ];
    return cumulativeMetrics.includes(metric);
  }
}
