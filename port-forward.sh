#!/usr/bin/env bash

# Port-forward to access services running in Kubernetes.

NAMESPACE="rateit"

pkill -f "[k]ubectl port-forward -n ${NAMESPACE} svc/rateit-backend" || true
pkill -f "[k]ubectl port-forward -n ${NAMESPACE} svc/rateit-postgresql" || true
pkill -f "[k]ubectl port-forward -n ${NAMESPACE} svc/rateit-minio" || true
pkill -f "[k]ubectl port-forward -n ${NAMESPACE} svc/rateit-minio-console" || true
pkill -f "[k]ubectl port-forward -n ${NAMESPACE} svc/rateit-kafka" || true
pkill -f "[k]ubectl port-forward -n ${NAMESPACE} svc/rateit-redis-master" || true
pkill -f "[k]ubectl port-forward -n ${NAMESPACE} svc/rateit-prometheus-server" || true
pkill -f "[k]ubectl port-forward -n ${NAMESPACE} svc/rateit-grafana" || true
pkill -f "[k]ubectl port-forward -n ${NAMESPACE} svc/rateit-mocker" || true

kubectl port-forward -n "$NAMESPACE" svc/rateit-backend 8081:80 &
kubectl port-forward -n "$NAMESPACE" svc/rateit-postgresql 5432:5432 &
kubectl port-forward -n "$NAMESPACE" svc/rateit-minio 9000:9000 &
kubectl port-forward -n "$NAMESPACE" svc/rateit-minio-console 9001:9001 &
kubectl port-forward -n "$NAMESPACE" svc/rateit-kafka 9092:9092 &
kubectl port-forward -n "$NAMESPACE" svc/rateit-redis-master 6379:6379 &
kubectl port-forward -n "$NAMESPACE" svc/rateit-prometheus-server 9090:80 &
kubectl port-forward -n "$NAMESPACE" svc/rateit-grafana 9091:80 &
kubectl port-forward -n "$NAMESPACE" svc/rateit-mocker 8099:8099 8098:8098 &

wait
