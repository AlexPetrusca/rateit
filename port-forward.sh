#!/usr/bin/env bash

# Port-forward to access services running in Kubernetes.

NAMESPACE="critic"
CONTEXT="docker-desktop"

pkill -f "[k]ubectl port-forward .*svc/critic-" || true

kubectl port-forward --context "$CONTEXT" -n "$NAMESPACE" svc/critic-backend 8081:80 &
kubectl port-forward --context "$CONTEXT" -n "$NAMESPACE" svc/critic-postgresql 5432:5432 &
kubectl port-forward --context "$CONTEXT" -n "$NAMESPACE" svc/critic-minio 9000:9000 &
kubectl port-forward --context "$CONTEXT" -n "$NAMESPACE" svc/critic-minio-console 9001:9001 &
kubectl port-forward --context "$CONTEXT" -n "$NAMESPACE" svc/critic-kafka 9092:9092 &
kubectl port-forward --context "$CONTEXT" -n "$NAMESPACE" svc/critic-redis-master 6379:6379 &
kubectl port-forward --context "$CONTEXT" -n "$NAMESPACE" svc/critic-prometheus-server 9090:80 &
kubectl port-forward --context "$CONTEXT" -n "$NAMESPACE" svc/critic-grafana 9091:80 &
kubectl port-forward --context "$CONTEXT" -n "$NAMESPACE" svc/critic-mocker 8090:8099 8099:8099 8098:8098 &
kubectl port-forward --context "$CONTEXT" -n "$NAMESPACE" svc/critic-nginx 3001:80 &

wait
