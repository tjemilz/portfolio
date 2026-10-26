"""
Custom pagination classes for the API with strict Denial of Service safeguards.
"""

from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """
    Standard pagination with bounded page sizes.
    - Default: 20 items per page
    - Configurable via ?page_size=N up to max 100 items.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_page_size(self, request):
        page_size = request.query_params.get(self.page_size_query_param)
        if page_size in ['0', 'all']:
            return self.max_page_size
        return super().get_page_size(request)
