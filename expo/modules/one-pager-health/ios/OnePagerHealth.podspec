Pod::Spec.new do |s|
  s.name           = 'OnePagerHealth'
  s.version        = '1.0.0'
  s.summary        = 'Private read-only Apple Health bridge for One Pager.'
  s.description    = 'Reads the current day step total from HealthKit for on-device One Pager context.'
  s.license        = { :type => 'MIT' }
  s.author         = 'One Pager'
  s.homepage       = 'https://join.onepagerapp.co.uk'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :git => 'https://github.com/Komzy98/rork-one-pager-beta.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'HealthKit'
  s.source_files = '**/*.{h,m,mm,swift}'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }
end
