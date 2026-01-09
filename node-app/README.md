Command:
  - >-
      New-Item -ItemType Directory -Force -Path 'C:\dynatrace\oneagent';
      Copy-Item -Recurse -Force 'C:\dynatrace\staging\*' 'C:\dynatrace\oneagent'