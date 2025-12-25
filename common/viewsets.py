from django.core.cache import cache
from rest_framework import viewsets
from rest_framework.response import Response

from common.cache import cache_key


class CachedModelViewSet(viewsets.ModelViewSet):
    """ModelViewSet with simple cache for list/retrieve and cache clear on write."""

    cache_timeout = 300

    def _cache_prefix(self) -> str:
        return getattr(self, "basename", self.__class__.__name__.lower())

    def _tenant_part(self, request) -> str:
        tenant_id = getattr(getattr(request, "user", None), "tenant_id", None)
        return str(tenant_id) if tenant_id else "public"

    def list(self, request, *args, **kwargs):
        key = cache_key(self._cache_prefix(), "list", self._tenant_part(request))
        cached = cache.get(key)
        if cached is not None:
            return Response(cached)

        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            data = self.get_paginated_response(serializer.data).data
        else:
            serializer = self.get_serializer(queryset, many=True)
            data = {"data": serializer.data}

        cache.set(key, data, self.cache_timeout)
        return Response(data)

    def retrieve(self, request, *args, **kwargs):
        pk = kwargs.get(self.lookup_field or "pk")
        key = cache_key(self._cache_prefix(), "detail", str(pk) if pk is not None else "")
        cached = cache.get(key)
        if cached is not None:
            return Response(cached)

        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        cache.set(key, data, self.cache_timeout)
        return Response(data)

    def _clear_cache(self):
        cache.clear()

    def perform_create(self, serializer):
        instance = serializer.save()
        self._clear_cache()
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        self._clear_cache()
        return instance

    def perform_destroy(self, instance):
        instance.delete()
        self._clear_cache()
