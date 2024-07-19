import os
import cv2
import shutil
import albumentations as A

# Define augmentations
transform = A.Compose([
    A.Resize(224, 448, cv2.INTER_LANCZOS4),
    #A.ShiftScaleRotate(shift_limit=0.05, scale_limit=0, rotate_limit=0, p=0.35),
    #A.RandomResizedCrop(height=224, width=448, scale=(0.8, 1.0), ratio=(1.85, 2.15), p=0.35),
    A.RandomBrightnessContrast(p=0.35),
    A.RandomGamma(p=0.35),
    A.RGBShift(p=0.35),
    A.Blur(blur_limit=3, p=0.1)
], bbox_params=A.BboxParams(format='yolo', label_fields=['category_ids']))

def read_labels(label_path):
    bboxes = []
    category_ids = []
    with open(label_path, 'r') as file:
        for line in file:
            parts = line.strip().split()
            category_id = int(parts[0])
            bbox = list(map(float, parts[1:]))
            bboxes.append(bbox)
            category_ids.append(category_id)
    return bboxes, category_ids

def write_labels(label_path, bboxes, category_ids):
    with open(label_path, 'w') as file:
        for bbox, category_id in zip(bboxes, category_ids):
            bbox_str = ' '.join(map(str, bbox))
            file.write(f"{category_id} {bbox_str}\n")

def augment_and_save(image_path, label_path, output_image_path, output_label_path, num_augmentations=10):
    # Load image and corresponding label
    image = cv2.imread(image_path)
    bboxes, category_ids = read_labels(label_path)
    
    # Apply augmentations
    for i in range(num_augmentations):
        augmented = transform(image=image, bboxes=bboxes, category_ids=category_ids)
        augmented_image = augmented['image']
        augmented_bboxes = augmented['bboxes']
        augmented_category_ids = augmented['category_ids']
        
        # Determine file extension and name
        file_extension = os.path.splitext(image_path)[1]
        output_image_name = f"{os.path.splitext(os.path.basename(image_path))[0]}_aug_{i}{file_extension}"
        output_image_file = os.path.join(output_image_path, output_image_name)
        output_label_file = os.path.join(output_label_path, f"{os.path.splitext(os.path.basename(label_path))[0]}_aug_{i}.txt")
        
        # Save augmented image and labels
        cv2.imwrite(output_image_file, augmented_image)
        write_labels(output_label_file, augmented_bboxes, augmented_category_ids)

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
output_train_images_dir = 'datasets/train/images'
output_train_labels_dir = 'datasets/train/labels'

input_val_images_dir = 'raw_data/valid/images'
input_val_labels_dir = 'raw_data/valid/labels'
output_val_images_dir = 'datasets/valid/images'
output_val_labels_dir = 'datasets/valid/labels'

# Process training and valid folders
process_directory(input_train_images_dir, input_train_labels_dir, output_train_images_dir, output_train_labels_dir, num_augmentations=25)
process_directory(input_val_images_dir, input_val_labels_dir, output_val_images_dir, output_val_labels_dir, num_augmentations=25)

# Copy data.yaml file
shutil.copy('raw_data/data.yaml', 'datasets/data.yaml')
