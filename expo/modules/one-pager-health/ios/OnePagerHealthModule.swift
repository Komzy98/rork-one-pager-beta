import ExpoModulesCore
import HealthKit

public class OnePagerHealthModule: Module {
  private let healthStore = HKHealthStore()

  private var stepType: HKQuantityType? {
    HKObjectType.quantityType(forIdentifier: .stepCount)
  }

  public func definition() -> ModuleDefinition {
    Name("OnePagerHealth")

    Function("isHealthDataAvailable") {
      return HKHealthStore.isHealthDataAvailable() && self.stepType != nil
    }

    AsyncFunction("getStepAuthorizationRequestStatus") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable(), let stepType = self.stepType else {
        promise.resolve("unavailable")
        return
      }

      let readTypes: Set<HKObjectType> = [stepType]
      let shareTypes = Set<HKSampleType>()

      self.healthStore.getRequestStatusForAuthorization(toShare: shareTypes, read: readTypes) { status, _ in
        switch status {
        case .shouldRequest:
          promise.resolve("should_request")
        case .unnecessary:
          promise.resolve("unnecessary")
        case .unknown:
          fallthrough
        @unknown default:
          promise.resolve("unknown")
        }
      }
    }

    AsyncFunction("requestStepAuthorization") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable(), let stepType = self.stepType else {
        promise.resolve(false)
        return
      }

      let readTypes: Set<HKObjectType> = [stepType]
      let shareTypes = Set<HKSampleType>()

      self.healthStore.requestAuthorization(toShare: shareTypes, read: readTypes) { success, _ in
        // HealthKit deliberately does not reveal whether read access was granted for
        // a particular type. `success` only means the authorization flow completed.
        promise.resolve(success)
      }
    }.runOnQueue(.main)

    AsyncFunction("getTodaySteps") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable(), let stepType = self.stepType else {
        promise.resolve(nil)
        return
      }

      let now = Date()
      let startOfDay = Calendar.current.startOfDay(for: now)
      let predicate = HKQuery.predicateForSamples(
        withStart: startOfDay,
        end: now,
        options: .strictStartDate
      )

      let query = HKStatisticsQuery(
        quantityType: stepType,
        quantitySamplePredicate: predicate,
        options: .cumulativeSum
      ) { _, statistics, _ in
        guard let quantity = statistics?.sumQuantity() else {
          // Read denial is intentionally indistinguishable from unavailable data.
          // Returning nil prevents One Pager from pretending the user took 0 steps.
          promise.resolve(nil)
          return
        }

        let steps = quantity.doubleValue(for: HKUnit.count())
        promise.resolve(max(0, Int(steps.rounded())))
      }

      self.healthStore.execute(query)
    }
  }
}
