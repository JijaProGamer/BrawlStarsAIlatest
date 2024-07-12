import os
import cv2
import shutil
import albumentations as A

# Define augmentations
transform = A.Compose([
    A.Resize(224, 448),

    A.HorizontalFlip(p=0.5),
    A.ShiftScaleRotate(shift_limit=0.04, scale_limit=0, rotate_limit=0, p=0.35),

    A.RandomBrightnessContrast(p=0.35),
    A.RandomGamma(p=0.35),
    A.RGBShift(p=0.35),
    A.Blur(blur_limit=2, p=0.35)
], bbox_params=A.BboxParams(format='yolo'))

def augment_and_save(image_path, label_path, output_image_path, output_label_path, num_augmentations=10):
    # Load image and corresponding label
    image = cv2.imread(image_path)
    with open(label_path, 'r') as file:
        labels = file.read()
    
    # Apply augmentations
    for i in range(num_augmentations):
        augmented = transform(image=image)
        augmented_image = augmented['image']
        
        # Determine file extension and name
        file_extension = os.path.splitext(image_path)[1]
        output_image_name = f"{os.path.splitext(os.path.basename(image_path))[0]}_aug_{i}{file_extension}"
        output_image_file = os.path.join(output_image_path, output_image_name)
        output_label_file = os.path.join(output_label_path, f"{os.path.splitext(os.path.basename(label_path))[0]}_aug_{i}.txt")
        
        # Save augmented image and labels
        cv2.imwrite(output_image_file, augmented_image)
        with open(output_label_file, 'w') as file:
            file.write(labels)

def process_directory(images_dir, labels_dir, output_images_dir, output_labels_dir, num_augmentations=10):
    for file in os.listdir(images_dir):
        if file.endswith(('.png', '.jpg', '.jpeg')):
            image_path = os.path.join(images_dir, file)
            label_path = os.path.join(labels_dir, os.path.splitext(file)[0] + '.txt')
            
            if os.path.exists(label_path):
                os.makedirs(output_images_dir, exist_ok=True)
                os.makedirs(output_labels_dir, exist_ok=True)
                
                augment_and_save(image_path, label_path, output_images_dir, output_labels_dir, num_augmentations)

# Define input and output directories
input_train_images_dir = 'raw_data/train/images'
input_train_labels_dir = 'raw_data/train/labels'
output_train_images_dir = 'data/train/images'
output_train_labels_dir = 'data/train/labels'

input_val_images_dir = 'raw_data/valid/images'
input_val_labels_dir = 'raw_data/valid/labels'
output_val_images_dir = 'data/valid/images'
output_val_labels_dir = 'data/valid/labels'

# Process training and valid folders
process_directory(input_train_images_dir, input_train_labels_dir, output_train_images_dir, output_train_labels_dir, num_augmentations=10)
process_directory(input_val_images_dir, input_val_labels_dir, output_val_images_dir, output_val_labels_dir, num_augmentations=10)

# Copy data.yaml file
shutil.copy('raw_data/data.yaml', 'data/data.yaml')
