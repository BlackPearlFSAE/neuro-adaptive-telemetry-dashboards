#!/usr/bin/env python3
"""
Scene Reconstruction Module
3D scene reconstruction from monocular depth maps.

Features:
- Point cloud generation from depth maps
- Real-time 3D mesh creation
- Export to PLY, GLB, PCD formats
- Scene filtering and downsampling
"""

import numpy as np
import struct
import json
from typing import Tuple, Optional, List
from dataclasses import dataclass
from pathlib import Path


@dataclass
class PointCloud:
    """3D point cloud data."""
    points: np.ndarray  # Nx3 array of XYZ coordinates
    colors: Optional[np.ndarray] = None  # Nx3 array of RGB (0-255)
    normals: Optional[np.ndarray] = None  # Nx3 array of normal vectors
    
    @property
    def num_points(self) -> int:
        return len(self.points)
    
    @property
    def bounds(self) -> Tuple[np.ndarray, np.ndarray]:
        """Get min/max bounds."""
        if len(self.points) == 0:
            return np.zeros(3), np.zeros(3)
        return self.points.min(axis=0), self.points.max(axis=0)


class SceneReconstruction:
    """
    Scene Reconstruction from Depth Maps
    
    Converts 2D depth maps to 3D point clouds and meshes
    for scene visualization and analysis.
    """
    
    def __init__(
        self,
        fx: float = 500.0,  # Focal length X
        fy: float = 500.0,  # Focal length Y
        cx: float = 320.0,  # Principal point X
        cy: float = 240.0,  # Principal point Y
        depth_scale: float = 10.0,  # Depth scaling factor
        max_depth: float = 50.0,  # Maximum depth in meters
        downsample_factor: int = 4,  # Spatial downsampling
    ):
        """
        Initialize scene reconstruction.
        
        Args:
            fx, fy: Focal lengths in pixels
            cx, cy: Principal point coordinates
            depth_scale: Scale for converting normalized depth
            max_depth: Maximum depth to include
            downsample_factor: Spatial downsampling (1 = full resolution)
        """
        self.fx = fx
        self.fy = fy
        self.cx = cx
        self.cy = cy
        self.depth_scale = depth_scale
        self.max_depth = max_depth
        self.downsample = downsample_factor
    
    def depth_to_pointcloud(
        self,
        depth_map: np.ndarray,
        rgb_image: Optional[np.ndarray] = None,
        use_colormap: bool = True,
        filter_points: bool = True,
    ) -> PointCloud:
        """
        Convert depth map to 3D point cloud.
        
        Args:
            depth_map: Normalized depth map (0-1, higher = closer)
            rgb_image: Optional BGR image for coloring
            use_colormap: Use depth colormap if no RGB provided
            
        Returns:
            PointCloud object
        """
        h, w = depth_map.shape[:2]
        
        # Downsample
        if self.downsample > 1:
            depth_map = depth_map[::self.downsample, ::self.downsample]
            if rgb_image is not None:
                rgb_image = rgb_image[::self.downsample, ::self.downsample]
            h, w = depth_map.shape[:2]
        
        # Update principal point for downsampled image
        cx = self.cx / self.downsample
        cy = self.cy / self.downsample
        fx = self.fx / self.downsample
        fy = self.fy / self.downsample
        
        # Create pixel coordinate grids
        u, v = np.meshgrid(np.arange(w), np.arange(h))
        
        # Convert normalized depth to metric depth
        # Inverse relationship: higher value = closer = smaller Z
        metric_depth = np.where(
            depth_map > 0.01,
            self.depth_scale / depth_map,
            self.max_depth
        )
        
        # Clip to valid range
        metric_depth = np.clip(metric_depth, 0.1, self.max_depth)
        
        # Back-project to 3D
        # X = (u - cx) * Z / fx
        # Y = (v - cy) * Z / fy
        # Z = depth
        z = metric_depth
        x = (u - cx) * z / fx
        y = (v - cy) * z / fy
        
        # Stack into Nx3 array
        points = np.stack([x, y, z], axis=-1).reshape(-1, 3)
        
        colors = None
        # Get colors
        if rgb_image is not None:
            # Convert BGR to RGB
            colors = rgb_image[:, :, ::-1].reshape(-1, 3)
        
        if use_colormap and colors is None:
            import cv2
            depth_uint8 = (depth_map * 255).astype(np.uint8)
            colored = cv2.applyColorMap(depth_uint8, cv2.COLORMAP_INFERNO)
            colors = colored[:, :, ::-1].reshape(-1, 3)  # BGR to RGB
        
        # Filter out invalid points (too far or at edge)
        if filter_points:
            mask = (z.flatten() < self.max_depth) & (z.flatten() > 0.1)
            points = points[mask]
            if colors is not None:
                colors = colors[mask]
        
        return PointCloud(points=points, colors=colors)
    
    def estimate_normals(self, cloud: PointCloud) -> PointCloud:
        """
        Estimate surface normals for point cloud.
        
        Args:
            cloud: Input point cloud
            
        Returns:
            Point cloud with normals
        """
        # Simple cross-product based normal estimation
        # This is a simplified version - Open3D has better methods
        points = cloud.points
        n = len(points)
        
        if n < 3:
            return cloud
        
        normals = np.zeros_like(points)
        
        # For each point, find nearby points and compute normal
        # Using simple neighbor differences
        for i in range(n):
            # Just point outward for now (simplified)
            normals[i] = [0, 0, -1]
        
        return PointCloud(
            points=cloud.points,
            colors=cloud.colors,
            normals=normals
        )
    
    def create_mesh(
        self,
        depth_map: np.ndarray,
        rgb_image: Optional[np.ndarray] = None,
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Create triangle mesh from depth map.
        
        Args:
            depth_map: Normalized depth map
            rgb_image: Optional color image
            
        Returns:
            vertices: Nx3 vertex positions
            faces: Mx3 triangle indices
            colors: Nx3 vertex colors
        """
        h, w = depth_map.shape[:2]
        
        # Downsample
        step = self.downsample
        depth_sampled = depth_map[::step, ::step]
        new_h, new_w = depth_sampled.shape[:2]
        
        if rgb_image is not None:
            rgb_sampled = rgb_image[::step, ::step]
        else:
            rgb_sampled = None
        
        # Create point cloud first
        # Create point cloud first (keep all points to preserve grid)
        cloud = self.depth_to_pointcloud(depth_map, filter_points=False)
        
        # Reshape points to grid
        points_grid = cloud.points.reshape(new_h, new_w, 3)
        z_values = points_grid[:, :, 2]
        
        # Generate triangle indices
        faces = []
        for i in range(new_h - 1):
            for j in range(new_w - 1):
                # Check if all vertices in this quad are valid
                z1 = z_values[i, j]
                z2 = z_values[i, j+1]
                z3 = z_values[i+1, j]
                z4 = z_values[i+1, j+1]
                
                # Check validity criteria
                valid1 = 0.1 < z1 < self.max_depth
                valid2 = 0.1 < z2 < self.max_depth
                valid3 = 0.1 < z3 < self.max_depth
                valid4 = 0.1 < z4 < self.max_depth
                
                idx = i * new_w + j
                
                # Create triangles only if vertices are valid
                if valid1 and valid2 and valid3:
                    faces.append([idx, idx + 1, idx + new_w])
                
                if valid2 and valid3 and valid4:
                    faces.append([idx + 1, idx + new_w + 1, idx + new_w])
        
        return cloud.points, np.array(faces), cloud.colors
    
    def export_ply(self, cloud: PointCloud, filepath: str):
        """
        Export point cloud to PLY format.
        
        Args:
            cloud: Point cloud data
            filepath: Output file path
        """
        filepath = Path(filepath)
        filepath.parent.mkdir(parents=True, exist_ok=True)
        
        n = cloud.num_points
        has_colors = cloud.colors is not None
        has_normals = cloud.normals is not None
        
        # PLY header
        header = [
            "ply",
            "format ascii 1.0",
            f"element vertex {n}",
            "property float x",
            "property float y",
            "property float z",
        ]
        
        if has_normals:
            header.extend([
                "property float nx",
                "property float ny",
                "property float nz",
            ])
        
        if has_colors:
            header.extend([
                "property uchar red",
                "property uchar green",
                "property uchar blue",
            ])
        
        header.append("end_header")
        
        with open(filepath, 'w') as f:
            f.write('\n'.join(header) + '\n')
            
            for i in range(n):
                line = f"{cloud.points[i, 0]:.6f} {cloud.points[i, 1]:.6f} {cloud.points[i, 2]:.6f}"
                
                if has_normals:
                    line += f" {cloud.normals[i, 0]:.6f} {cloud.normals[i, 1]:.6f} {cloud.normals[i, 2]:.6f}"
                
                if has_colors:
                    r, g, b = cloud.colors[i].astype(int)
                    line += f" {r} {g} {b}"
                
                f.write(line + '\n')
        
        print(f"✅ Exported PLY: {filepath} ({n} points)")
    
    def export_glb(
        self,
        vertices: np.ndarray,
        faces: np.ndarray,
        colors: Optional[np.ndarray],
        filepath: str,
    ):
        """
        Export mesh to GLB format.
        
        Args:
            vertices: Nx3 vertex positions
            faces: Mx3 triangle indices
            colors: Nx3 vertex colors (0-255)
            filepath: Output file path
        """
        filepath = Path(filepath)
        filepath.parent.mkdir(parents=True, exist_ok=True)
        
        # Prepare binary data
        positions_bin = vertices.astype(np.float32).tobytes()
        indices_bin = faces.astype(np.uint32).tobytes()
        
        if colors is not None:
            colors_normalized = (colors / 255.0).astype(np.float32)
            colors_bin = colors_normalized.tobytes()
        else:
            colors_bin = b''
        
        # Calculate bounds
        pos_min = vertices.min(axis=0).tolist()
        pos_max = vertices.max(axis=0).tolist()
        
        # Buffer layout
        pos_offset = 0
        pos_length = len(positions_bin)
        
        idx_offset = pos_length
        idx_length = len(indices_bin)
        
        col_offset = idx_offset + idx_length
        col_length = len(colors_bin)
        
        total_buffer_length = pos_length + idx_length + col_length
        
        # Create GLTF JSON
        gltf = {
            "asset": {"version": "2.0", "generator": "DepthAnything_SceneReconstruction"},
            "scene": 0,
            "scenes": [{"nodes": [0]}],
            "nodes": [{"mesh": 0}],
            "meshes": [{"primitives": [{"attributes": {"POSITION": 0}, "indices": 1, "mode": 4}]}],
            "accessors": [
                {
                    "bufferView": 0,
                    "componentType": 5126,
                    "count": len(vertices),
                    "type": "VEC3",
                    "min": pos_min,
                    "max": pos_max
                },
                {
                    "bufferView": 1,
                    "componentType": 5125,
                    "count": len(faces) * 3,
                    "type": "SCALAR"
                },
            ],
            "bufferViews": [
                {"buffer": 0, "byteOffset": pos_offset, "byteLength": pos_length},
                {"buffer": 0, "byteOffset": idx_offset, "byteLength": idx_length},
            ],
            "buffers": [{"byteLength": total_buffer_length}]
        }
        
        if colors is not None and col_length > 0:
            gltf["meshes"][0]["primitives"][0]["attributes"]["COLOR_0"] = 2
            gltf["accessors"].append({
                "bufferView": 2,
                "componentType": 5126,
                "count": len(colors),
                "type": "VEC3"
            })
            gltf["bufferViews"].append({
                "buffer": 0, "byteOffset": col_offset, "byteLength": col_length
            })
        
        gltf_json = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
        
        # Pad to 4-byte alignment
        while len(gltf_json) % 4 != 0:
            gltf_json += b' '
        
        # Binary buffer
        bin_buffer = positions_bin + indices_bin + colors_bin
        while len(bin_buffer) % 4 != 0:
            bin_buffer += b'\x00'
        
        # GLB structure
        json_chunk = struct.pack('<I', len(gltf_json)) + b'JSON' + gltf_json
        bin_chunk = struct.pack('<I', len(bin_buffer)) + b'BIN\x00' + bin_buffer
        
        total_length = 12 + len(json_chunk) + len(bin_chunk)
        header = b'glTF' + struct.pack('<II', 2, total_length)
        
        with open(filepath, 'wb') as f:
            f.write(header + json_chunk + bin_chunk)
        
        print(f"✅ Exported GLB: {filepath} ({len(vertices)} vertices, {len(faces)} triangles)")
    
    def reconstruct_from_video_frame(
        self,
        frame: np.ndarray,
        depth_map: np.ndarray,
        output_dir: str,
        frame_id: int,
        formats: List[str] = ["glb"],
    ):
        """
        Reconstruct 3D scene from a video frame.
        
        Args:
            frame: BGR image
            depth_map: Normalized depth map
            output_dir: Output directory
            frame_id: Frame number
            formats: Output formats (glb, ply)
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Create point cloud
        cloud = self.depth_to_pointcloud(depth_map, frame)
        
        if "ply" in formats:
            self.export_ply(
                cloud,
                str(output_path / f"frame_{frame_id:05d}.ply")
            )
        
        if "glb" in formats:
            vertices, faces, colors = self.create_mesh(depth_map, frame)
            self.export_glb(
                vertices, faces, colors,
                str(output_path / f"frame_{frame_id:05d}.glb")
            )
        
        return cloud


# ============================================================================
# Testing
# ============================================================================

if __name__ == "__main__":
    print("🏗️ Scene Reconstruction Test")
    
    # Create test depth map
    h, w = 480, 640
    y, x = np.meshgrid(np.arange(h), np.arange(w), indexing='ij')
    depth_map = 0.5 + 0.3 * np.sin(x / 50) * np.cos(y / 50)
    depth_map = depth_map.astype(np.float32)
    
    # Create test RGB image
    rgb_image = np.zeros((h, w, 3), dtype=np.uint8)
    rgb_image[:, :, 0] = 100  # Blue channel
    rgb_image[:, :, 1] = 150  # Green channel
    rgb_image[:, :, 2] = 200  # Red channel
    
    reconstructor = SceneReconstruction(downsample_factor=4)
    
    # Test point cloud generation
    cloud = reconstructor.depth_to_pointcloud(depth_map, rgb_image)
    print(f"\nPoint cloud: {cloud.num_points} points")
    print(f"Bounds: {cloud.bounds[0]} to {cloud.bounds[1]}")
    
    # Test mesh generation
    vertices, faces, colors = reconstructor.create_mesh(depth_map, rgb_image)
    print(f"Mesh: {len(vertices)} vertices, {len(faces)} triangles")
    
    print("\n✅ Test complete!")
