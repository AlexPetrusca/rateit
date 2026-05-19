#!/usr/bin/env bash

# Port-forward to access postgres and minio running in kubernetes.

NAMESPACE="rateit"

pkill -f "kubectl port-forward -n ${NAMESPACE} svc/rateit-backend"
pkill -f "kubectl port-forward -n ${NAMESPACE} svc/rateit-postgresql"
pkill -f "kubectl port-forward -n ${NAMESPACE} svc/rateit-minio"
pkill -f "kubectl port-forward -n ${NAMESPACE} svc/rateit-minio-console"
pkill -f "kubectl port-forward -n ${NAMESPACE} svc/rateit-kafka"
pkill -f "kubectl port-forward -n ${NAMESPACE} svc/rateit-redis-master"
pkill -f "kubectl port-forward -n ${NAMESPACE} svc/rateit-prometheus-server"
pkill -f "kubectl port-forward -n ${NAMESPACE} svc/rateit-grafana"
pkill -f "kubectl port-forward -n ${NAMESPACE} svc/rateit-mocker"
pkill -f "socat"

kubectl port-forward -n "$NAMESPACE" svc/rateit-backend 8081:80 &
kubectl port-forward -n "$NAMESPACE" svc/rateit-postgresql 5432:5432 &
kubectl port-forward -n "$NAMESPACE" svc/rateit-minio 9000:9000 &
kubectl port-forward -n "$NAMESPACE" svc/rateit-minio-console 9001:9001 &
kubectl port-forward -n "$NAMESPACE" svc/rateit-kafka 9092:9092 &
kubectl port-forward -n "$NAMESPACE" svc/rateit-redis-master 6379:6379 &
kubectl port-forward -n "$NAMESPACE" svc/rateit-prometheus-server 9090:80 &
kubectl port-forward -n "$NAMESPACE" svc/rateit-grafana 9091:80 &
kubectl port-forward -n "$NAMESPACE" svc/rateit-mocker 8099:8099 8098:8098 &
socat TCP-LISTEN:8099,fork TCP:127.0.0.1:8099
