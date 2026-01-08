# Runtime image
FROM mcr.microsoft.com/dotnet/framework/aspnet:4.8-windowsservercore-ltsc2019
WORKDIR /App
COPY --from=build-env /App/out ./
EXPOSE 8085

# Keep the original app start as CMD
CMD ["dotnet", "QTSWebUI.dll"]

# Wrap startup with Dynatrace (Windows manual injection)
ENTRYPOINT ["powershell", "-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "\
  $dt1 = 'C:\\opt\\dynatrace\\oneagent\\dynatrace-agent64.ps1'; \
  $dt2 = 'C:\\opt\\dynatrace\\oneagent\\dynatrace-agent64.cmd'; \
  if (Test-Path $dt1) { \
    Write-Host 'Starting with Dynatrace OneAgent (ps1)'; \
    & $dt1 @args; \
  } elseif (Test-Path $dt2) { \
    Write-Host 'Starting with Dynatrace OneAgent (cmd)'; \
    & $dt2 @args; \
  } else { \
    Write-Host 'Dynatrace bootstrap not found - starting normally'; \
    & $args[0] $args[1..($args.Length-1)]; \
  }", "--"]