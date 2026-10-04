require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'NguyenduyBlur'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']['name']
  s.homepage       = package['homepage']
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => 'https://github.com/nguyenduy1412/react-native-blur.git', :tag => "v#{s.version}" }
  s.swift_version  = '5.0'

  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.private_header_files = 'ios/**/*.h'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }

  install_modules_dependencies(s)
end
