{{/*
Labels that must match between deployment selector and pods
*/}}
{{- define "critic.selectorLabels" -}}
app: critic
instance: {{ .Release.Name }}
{{- end }}
