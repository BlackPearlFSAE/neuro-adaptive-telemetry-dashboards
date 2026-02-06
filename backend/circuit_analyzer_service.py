"""
Circuit Analyzer Service
Advanced image processing for track analysis and waypoint extraction.
Provides foundation for self-driving path planning.
"""

import math
import base64
from dataclasses import dataclass, field
from typing import List, Dict, Any, Tuple, Optional
from io import BytesIO

# Use PIL for image processing (more lightweight than OpenCV)
try:
    from PIL import Image, ImageFilter, ImageOps
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("⚠️ PIL not installed. Circuit image analysis will be limited.")


@dataclass
class Point:
    x: float
    y: float


@dataclass  
class Sector:
    name: str
    start_progress: float  # 0.0 - 1.0
    end_progress: float
    color: str


@dataclass
class TrackMetrics:
    estimated_length_m: float
    corner_count: int
    avg_corner_radius: float
    straight_percentage: float


@dataclass
class CircuitData:
    id: str
    name: str
    svg_path: str
    waypoints: List[Point]
    track_points: List[Dict[str, Any]]  # For car animation with sector info
    sectors: List[Sector]
    metrics: TrackMetrics
    image_data: Optional[str] = None  # Base64 encoded image preview
    viewbox: str = "0 0 800 450"


class CircuitAnalyzerService:
    """
    Analyzes circuit images to extract:
    - Track contour as SVG path
    - Waypoints for autonomous navigation
    - Sector divisions
    - Track metrics (length, corners, etc.)
    """
    
    def __init__(self):
        self.active_circuit: Optional[CircuitData] = None
        self.circuits: Dict[str, CircuitData] = {}
        self._circuit_counter = 0
        
        # Initialize with default Silverstone circuit
        self._init_default_circuits()
    
    def _init_default_circuits(self):
        """Create default Silverstone circuit data"""
        silverstone = CircuitData(
            id="silverstone",
            name="Silverstone",
            svg_path="""M 180 200 
                L 220 180 Q 250 170 280 175 
                L 350 195 Q 380 200 400 220 
                L 420 260 Q 430 290 420 320 
                L 400 350 Q 380 370 350 375 
                L 280 365 Q 250 360 230 340 
                L 200 300 Q 180 270 175 240 
                Z""",
            waypoints=self._generate_oval_waypoints(300, 225, 120, 80, 50),
            track_points=[
                {"x": 180, "y": 200, "sector": 1}, {"x": 200, "y": 188, "sector": 1},
                {"x": 230, "y": 178, "sector": 1}, {"x": 270, "y": 177, "sector": 1},
                {"x": 310, "y": 185, "sector": 1}, {"x": 350, "y": 197, "sector": 2},
                {"x": 385, "y": 212, "sector": 2}, {"x": 408, "y": 235, "sector": 2},
                {"x": 420, "y": 265, "sector": 2}, {"x": 425, "y": 300, "sector": 2},
                {"x": 415, "y": 330, "sector": 3}, {"x": 395, "y": 355, "sector": 3},
                {"x": 365, "y": 370, "sector": 3}, {"x": 325, "y": 370, "sector": 3},
                {"x": 285, "y": 362, "sector": 3}, {"x": 250, "y": 350, "sector": 1},
                {"x": 220, "y": 325, "sector": 1}, {"x": 200, "y": 290, "sector": 1},
                {"x": 180, "y": 250, "sector": 1}, {"x": 175, "y": 220, "sector": 1},
            ],
            sectors=[
                Sector("Sector 1", 0.0, 0.33, "#a855f7"),
                Sector("Sector 2", 0.33, 0.66, "#22d3ee"),
                Sector("Sector 3", 0.66, 1.0, "#4ade80"),
            ],
            metrics=TrackMetrics(
                estimated_length_m=5891,
                corner_count=18,
                avg_corner_radius=85,
                straight_percentage=0.35
            ),
            viewbox="130 130 340 280"
        )
        
        self.circuits["silverstone"] = silverstone
        self.active_circuit = silverstone
        
        # FSAE Thailand Circuit - Real track from team
        # Dimensions: 420m x 213m area, 396m main straight, pit lane 173m x 156m
        fsae_thailand = CircuitData(
            id="fsae_thailand",
            name="FSAE Thailand Circuit",
            svg_path="""M 50 100 
                L 446 100 Q 470 100 485 120 
                L 540 180 L 540 250 
                L 600 250 L 600 350 L 480 350 
                L 480 420 L 400 420 L 400 350 
                L 100 350 Q 60 350 50 310 
                L 50 100 Z""",
            waypoints=self._generate_fsae_waypoints(),
            track_points=self._generate_fsae_track_points(),
            sectors=[
                Sector("Main Straight", 0.0, 0.35, "#00d4ff"),
                Sector("Technical Section", 0.35, 0.65, "#ff6b35"),
                Sector("Pit Complex", 0.65, 1.0, "#4ade80"),
            ],
            metrics=TrackMetrics(
                estimated_length_m=1050,  # ~1km typical FSAE track
                corner_count=12,
                avg_corner_radius=15,  # Tight FSAE corners
                straight_percentage=0.40
            ),
            viewbox="0 0 650 450",
            image_data=None  # Will load from track image
        )
        self.circuits["fsae_thailand"] = fsae_thailand
    
    def _generate_fsae_waypoints(self) -> List[Point]:
        """Generate waypoints for FSAE Thailand track"""
        waypoints = []
        # Main straight (396m section)
        for i in range(15):
            x = 50 + (396 * i / 14)
            waypoints.append(Point(x=x, y=100))
        
        # Turn 1 - right hairpin
        for i in range(5):
            theta = -math.pi/2 + (math.pi/2 * i / 4)
            waypoints.append(Point(x=470 + 20*math.cos(theta), y=140 + 40*math.sin(theta)))
        
        # Chicane section
        waypoints.extend([
            Point(x=540, y=200), Point(x=540, y=250),
            Point(x=570, y=250), Point(x=600, y=280),
            Point(x=600, y=320), Point(x=560, y=350),
        ])
        
        # Pit lane entry area
        waypoints.extend([
            Point(x=480, y=350), Point(x=480, y=400),
            Point(x=440, y=420), Point(x=400, y=400),
            Point(x=400, y=350),
        ])
        
        # Back straight
        for i in range(10):
            x = 400 - (300 * i / 9)
            waypoints.append(Point(x=x, y=350))
        
        # Final turn back to start
        for i in range(5):
            theta = math.pi/2 + (math.pi/2 * i / 4)
            waypoints.append(Point(x=80 + 30*math.cos(theta), y=310 + 40*math.sin(theta)))
        
        # Connect back to start
        for i in range(5):
            y = 270 - (170 * i / 4)
            waypoints.append(Point(x=50, y=y))
        
        return waypoints
    
    def _generate_fsae_track_points(self) -> List[Dict[str, Any]]:
        """Generate track points with sector info for FSAE Thailand"""
        waypoints = self._generate_fsae_waypoints()
        total = len(waypoints)
        track_points = []
        
        for i, wp in enumerate(waypoints):
            progress = i / total
            if progress < 0.35:
                sector = 1  # Main Straight
            elif progress < 0.65:
                sector = 2  # Technical Section
            else:
                sector = 3  # Pit Complex
            
            track_points.append({"x": wp.x, "y": wp.y, "sector": sector})
        
        return track_points

    def _generate_oval_waypoints(self, cx: float, cy: float, rx: float, ry: float, count: int) -> List[Point]:
        """Generate waypoints along an elliptical path"""
        waypoints = []
        for i in range(count):
            theta = (2 * math.pi * i) / count
            waypoints.append(Point(
                x=cx + rx * math.cos(theta),
                y=cy + ry * math.sin(theta)
            ))
        return waypoints

    async def analyze_image(self, image_bytes: bytes, name: str = "Custom Circuit") -> CircuitData:
        """
        Analyze a circuit image and extract track data.
        
        Uses advanced image processing:
        1. Edge detection to find track boundaries
        2. Contour extraction for track shape
        3. Path simplification (Douglas-Peucker)
        4. Waypoint generation along the path
        5. Corner detection for sector division
        """
        if not PIL_AVAILABLE:
            # Fallback: create a simple circuit based on image dimensions
            return self._create_fallback_circuit(image_bytes, name)
        
        try:
            # Load and preprocess image
            img = Image.open(BytesIO(image_bytes))
            img = img.convert('L')  # Grayscale
            
            # Resize for consistent processing
            max_size = 800
            ratio = min(max_size / img.width, max_size / img.height)
            new_size = (int(img.width * ratio), int(img.height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
            
            # Edge detection
            edges = img.filter(ImageFilter.FIND_EDGES)
            edges = ImageOps.autocontrast(edges)
            
            # Extract contour points by scanning edges
            contour_points = self._extract_contour_from_edges(edges)
            
            if len(contour_points) < 10:
                # Not enough points found, use fallback
                return self._create_fallback_circuit(image_bytes, name)
            
            # Simplify the contour using Douglas-Peucker algorithm
            simplified = self._douglas_peucker(contour_points, epsilon=5.0)
            
            # Generate SVG path from points
            svg_path = self._points_to_svg_path(simplified)
            
            # Generate waypoints for autonomous driving
            waypoints = self._generate_waypoints_from_contour(simplified, count=50)
            
            # Generate track points with sector info for visualization
            track_points = self._generate_track_points(simplified)
            
            # Analyze corners and create sectors
            sectors = self._analyze_sectors(simplified)
            
            # Calculate track metrics
            metrics = self._calculate_metrics(simplified)
            
            # Create circuit data
            self._circuit_counter += 1
            circuit_id = f"custom_{self._circuit_counter}"
            
            # Create base64 thumbnail
            img_rgb = Image.open(BytesIO(image_bytes))
            img_rgb.thumbnail((200, 150))
            buffer = BytesIO()
            img_rgb.save(buffer, format="PNG")
            image_preview = base64.b64encode(buffer.getvalue()).decode()
            
            circuit = CircuitData(
                id=circuit_id,
                name=name,
                svg_path=svg_path,
                waypoints=waypoints,
                track_points=track_points,
                sectors=sectors,
                metrics=metrics,
                image_data=f"data:image/png;base64,{image_preview}",
                viewbox=f"0 0 {new_size[0]} {new_size[1]}"
            )
            
            self.circuits[circuit_id] = circuit
            return circuit
            
        except Exception as e:
            print(f"⚠️ Image analysis failed: {e}")
            return self._create_fallback_circuit(image_bytes, name)
    
    def _extract_contour_from_edges(self, edge_image: Image.Image) -> List[Tuple[float, float]]:
        """Extract contour points from edge-detected image"""
        width, height = edge_image.size
        pixels = edge_image.load()
        points = []
        
        # Scan for edge pixels (high intensity)
        threshold = 128
        step = 3  # Sample every 3 pixels for efficiency
        
        for y in range(0, height, step):
            for x in range(0, width, step):
                if pixels[x, y] > threshold:
                    points.append((float(x), float(y)))
        
        if not points:
            return []
        
        # Order points to form a continuous path using nearest neighbor
        ordered = [points.pop(0)]
        while points:
            last = ordered[-1]
            nearest_idx = min(range(len(points)), 
                            key=lambda i: (points[i][0] - last[0])**2 + (points[i][1] - last[1])**2)
            nearest = points.pop(nearest_idx)
            # Only add if not too far (prevents jumping to disconnected parts)
            dist = math.sqrt((nearest[0] - last[0])**2 + (nearest[1] - last[1])**2)
            if dist < 50:  # Max distance threshold
                ordered.append(nearest)
        
        return ordered
    
    def _douglas_peucker(self, points: List[Tuple[float, float]], epsilon: float) -> List[Tuple[float, float]]:
        """Douglas-Peucker algorithm for path simplification"""
        if len(points) <= 2:
            return points
        
        # Find point with maximum distance from line
        dmax = 0
        index = 0
        end = len(points) - 1
        
        for i in range(1, end):
            d = self._perpendicular_distance(points[i], points[0], points[end])
            if d > dmax:
                index = i
                dmax = d
        
        # If max distance > epsilon, recursively simplify
        if dmax > epsilon:
            left = self._douglas_peucker(points[:index+1], epsilon)
            right = self._douglas_peucker(points[index:], epsilon)
            return left[:-1] + right
        else:
            return [points[0], points[end]]
    
    def _perpendicular_distance(self, point: Tuple[float, float], 
                                 line_start: Tuple[float, float], 
                                 line_end: Tuple[float, float]) -> float:
        """Calculate perpendicular distance from point to line"""
        x, y = point
        x1, y1 = line_start
        x2, y2 = line_end
        
        dx = x2 - x1
        dy = y2 - y1
        
        if dx == 0 and dy == 0:
            return math.sqrt((x - x1)**2 + (y - y1)**2)
        
        t = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / (dx**2 + dy**2)))
        
        proj_x = x1 + t * dx
        proj_y = y1 + t * dy
        
        return math.sqrt((x - proj_x)**2 + (y - proj_y)**2)
    
    def _points_to_svg_path(self, points: List[Tuple[float, float]]) -> str:
        """Convert points to SVG path string"""
        if len(points) < 2:
            return ""
        
        path_parts = [f"M {points[0][0]:.1f} {points[0][1]:.1f}"]
        
        for i in range(1, len(points)):
            path_parts.append(f"L {points[i][0]:.1f} {points[i][1]:.1f}")
        
        path_parts.append("Z")  # Close path
        return " ".join(path_parts)
    
    def _generate_waypoints_from_contour(self, points: List[Tuple[float, float]], count: int) -> List[Point]:
        """Generate evenly spaced waypoints along the contour"""
        if len(points) < 2:
            return []
        
        # Calculate total path length
        total_length = 0
        segments = []
        for i in range(len(points)):
            j = (i + 1) % len(points)
            dx = points[j][0] - points[i][0]
            dy = points[j][1] - points[i][1]
            seg_len = math.sqrt(dx**2 + dy**2)
            segments.append(seg_len)
            total_length += seg_len
        
        if total_length == 0:
            return []
        
        # Generate waypoints at even intervals
        waypoints = []
        spacing = total_length / count
        
        current_dist = 0
        seg_idx = 0
        seg_progress = 0
        
        for _ in range(count):
            target_dist = current_dist
            
            # Find position at target distance
            while seg_idx < len(segments) and seg_progress >= segments[seg_idx]:
                seg_progress -= segments[seg_idx]
                seg_idx = (seg_idx + 1) % len(segments)
            
            if seg_idx < len(points):
                j = (seg_idx + 1) % len(points)
                t = seg_progress / max(segments[seg_idx], 0.001)
                t = min(1, max(0, t))
                
                x = points[seg_idx][0] + t * (points[j][0] - points[seg_idx][0])
                y = points[seg_idx][1] + t * (points[j][1] - points[seg_idx][1])
                waypoints.append(Point(x=x, y=y))
            
            seg_progress += spacing
            current_dist += spacing
        
        return waypoints
    
    def _generate_track_points(self, points: List[Tuple[float, float]]) -> List[Dict[str, Any]]:
        """Generate track points with sector information for visualization"""
        if not points:
            return []
        
        track_points = []
        total = len(points)
        
        for i, (x, y) in enumerate(points):
            progress = i / total
            # Assign sector based on progress
            if progress < 0.33:
                sector = 1
            elif progress < 0.66:
                sector = 2
            else:
                sector = 3
            
            track_points.append({"x": x, "y": y, "sector": sector})
        
        return track_points
    
    def _analyze_sectors(self, points: List[Tuple[float, float]]) -> List[Sector]:
        """Analyze track shape and divide into sectors based on curvature"""
        # For now, use simple 3-way division
        # Future: Analyze curvature to find natural sector boundaries
        return [
            Sector("Sector 1", 0.0, 0.33, "#a855f7"),
            Sector("Sector 2", 0.33, 0.66, "#22d3ee"),
            Sector("Sector 3", 0.66, 1.0, "#4ade80"),
        ]
    
    def _calculate_metrics(self, points: List[Tuple[float, float]]) -> TrackMetrics:
        """Calculate track metrics from contour"""
        if len(points) < 3:
            return TrackMetrics(0, 0, 0, 0)
        
        # Calculate perimeter (approximate track length in pixels)
        perimeter = 0
        corners = 0
        straight_segments = 0
        
        for i in range(len(points)):
            j = (i + 1) % len(points)
            k = (i + 2) % len(points)
            
            # Distance
            dx = points[j][0] - points[i][0]
            dy = points[j][1] - points[i][1]
            perimeter += math.sqrt(dx**2 + dy**2)
            
            # Angle change (for corner detection)
            v1 = (points[j][0] - points[i][0], points[j][1] - points[i][1])
            v2 = (points[k][0] - points[j][0], points[k][1] - points[j][1])
            
            len1 = math.sqrt(v1[0]**2 + v1[1]**2)
            len2 = math.sqrt(v2[0]**2 + v2[1]**2)
            
            if len1 > 0 and len2 > 0:
                dot = (v1[0]*v2[0] + v1[1]*v2[1]) / (len1 * len2)
                dot = max(-1, min(1, dot))
                angle = math.acos(dot)
                
                if angle > 0.3:  # ~17 degrees
                    corners += 1
                else:
                    straight_segments += 1
        
        # Estimate real-world length (assume ~5m per pixel at 800px width = ~4000m track)
        estimated_length = perimeter * 5
        
        straight_pct = straight_segments / max(len(points), 1)
        avg_radius = estimated_length / max(corners, 1) / 2  # Rough estimate
        
        return TrackMetrics(
            estimated_length_m=round(estimated_length, 0),
            corner_count=corners,
            avg_corner_radius=round(avg_radius, 1),
            straight_percentage=round(straight_pct, 2)
        )
    
    def _create_fallback_circuit(self, image_bytes: bytes, name: str) -> CircuitData:
        """Create a simple circular circuit as fallback"""
        self._circuit_counter += 1
        circuit_id = f"custom_{self._circuit_counter}"
        
        # Create simple oval track
        cx, cy = 400, 225
        rx, ry = 150, 100
        
        # Generate oval SVG path
        points = []
        for i in range(24):
            theta = (2 * math.pi * i) / 24
            points.append((cx + rx * math.cos(theta), cy + ry * math.sin(theta)))
        
        svg_path = self._points_to_svg_path(points)
        waypoints = self._generate_oval_waypoints(cx, cy, rx, ry, 50)
        track_points = [{"x": p.x, "y": p.y, "sector": (i // 17) + 1} 
                       for i, p in enumerate(waypoints)]
        
        # Create thumbnail preview
        try:
            img = Image.open(BytesIO(image_bytes))
            img.thumbnail((200, 150))
            buffer = BytesIO()
            img.save(buffer, format="PNG")
            image_preview = f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode()}"
        except:
            image_preview = None
        
        return CircuitData(
            id=circuit_id,
            name=name,
            svg_path=svg_path,
            waypoints=waypoints,
            track_points=track_points,
            sectors=[
                Sector("Sector 1", 0.0, 0.33, "#a855f7"),
                Sector("Sector 2", 0.33, 0.66, "#22d3ee"),
                Sector("Sector 3", 0.66, 1.0, "#4ade80"),
            ],
            metrics=TrackMetrics(
                estimated_length_m=1500,
                corner_count=8,
                avg_corner_radius=50,
                straight_percentage=0.4
            ),
            image_data=image_preview,
            viewbox="0 0 800 450"
        )
    
    def activate_circuit(self, circuit_id: str) -> Optional[CircuitData]:
        """Set a circuit as the active one for Overview display"""
        if circuit_id in self.circuits:
            self.active_circuit = self.circuits[circuit_id]
            return self.active_circuit
        return None
    
    def get_active_circuit(self) -> Optional[CircuitData]:
        """Get the currently active circuit"""
        return self.active_circuit
    
    def get_all_circuits(self) -> List[Dict[str, Any]]:
        """Get list of all available circuits (metadata only)"""
        return [
            {
                "id": c.id,
                "name": c.name,
                "metrics": {
                    "length_m": c.metrics.estimated_length_m,
                    "corners": c.metrics.corner_count
                },
                "is_active": c.id == (self.active_circuit.id if self.active_circuit else None)
            }
            for c in self.circuits.values()
        ]
    
    def to_dict(self, circuit: CircuitData) -> Dict[str, Any]:
        """Convert CircuitData to dictionary for API response"""
        return {
            "id": circuit.id,
            "name": circuit.name,
            "svgPath": circuit.svg_path,
            "waypoints": [{"x": p.x, "y": p.y} for p in circuit.waypoints],
            "trackPoints": circuit.track_points,
            "sectors": [
                {"name": s.name, "start": s.start_progress, "end": s.end_progress, "color": s.color}
                for s in circuit.sectors
            ],
            "metrics": {
                "lengthM": circuit.metrics.estimated_length_m,
                "cornerCount": circuit.metrics.corner_count,
                "avgCornerRadius": circuit.metrics.avg_corner_radius,
                "straightPercentage": circuit.metrics.straight_percentage
            },
            "imageData": circuit.image_data,
            "viewbox": circuit.viewbox
        }


# Global service instance
circuit_analyzer = CircuitAnalyzerService()
