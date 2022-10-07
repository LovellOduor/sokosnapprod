from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.views import APIView
from json import JSONDecoder, JSONEncoder
import cv2
import mediapipe as mp
import urllib.request
import numpy as np
from PIL import Image
from binascii import a2b_base64
from rest_framework.decorators import api_view

class FaceApiView(APIView):
    def get(self,request):
        return Response({"faceapi":" Hello from get"})
        
    def post(self,request):
        image_request =  request.data
        image_data = image_request["image_data"]
        
        if(image_data == '' ):
            return Response({"multiFaceLandmarks":"null"})    
        

        # convert the image from data url to binary format
        binary_data = a2b_base64(image_data)

        # set the mediapipe solution 
        mp_face_mesh = mp.solutions.face_mesh

        # Create a face mesh object
        with mp_face_mesh.FaceMesh(
                static_image_mode=True,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5) as face_mesh:

            # Read image file with cv2 and convert from BGR to RGB
            
            req = urllib.request.Request(image_data)
            buffer = urllib.request.urlopen(req)
            bytes_as_np_array = np.frombuffer(buffer.read(), dtype=np.uint8)
            image = cv2.imdecode(bytes_as_np_array,cv2.IMREAD_UNCHANGED)
            results = face_mesh.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

        face_found = bool(results.multi_face_landmarks)
        if face_found:
            # Create a copy of the image
            annotated_image = image.copy()

            landmarks = []

            for landmark in results.multi_face_landmarks[0].landmark:
                landmarks.append({"x":landmark.x,"y":landmark.y,"z":landmark.z})

            json_encoded_landmarks = JSONEncoder().encode({"multiFaceLandmarks":[landmarks]})     

            return Response(json_encoded_landmarks)

        return Response({"multiFaceLandmarks":"null"})    