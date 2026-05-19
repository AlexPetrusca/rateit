{{/*
Labels that must match between deployment selector and pods
*/}}
{{- define "rateit.selectorLabels" -}}
app: rateit
instance: {{ .Release.Name }}
{{- end }}