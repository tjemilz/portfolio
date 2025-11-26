"""
Custom pagination classes for the API.
"""

from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """
    Standard pagination with configurable page size.
    - Default: 20 items per page
    - Use ?page_size=N to change (max 1000)
    - Use ?page_size=0 or ?page_size=all to get all results
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 1000

    def get_page_size(self, request):
        """Allow disabling pagination with page_size=0 or page_size=all"""
        page_size = request.query_params.get(self.page_size_query_param)
        
        if page_size in ['0', 'all']:
            return None  # Disable pagination
        
        return super().get_page_size(request)

    def paginate_queryset(self, queryset, request, view=None):
        """Return all results if pagination is disabled"""
        if self.get_page_size(request) is None:
            return None
        return super().paginate_queryset(queryset, request, view)
