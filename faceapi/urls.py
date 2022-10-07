from django.urls import path
from .views import FaceApiView

app_name = "faceapi"

urlpatterns = [
    path('',FaceApiView.as_view())
]