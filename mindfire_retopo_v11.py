import bpy
import bmesh
import math
from mathutils import Vector

bl_info = {
    "name": "Mindfire Auto-Retopo (v11.5 Hybrid Precision)",
    "author": "Mindfire Solution (Fixed Architecture)",
    "version": (11, 5),
    "blender": (3, 4, 0),
    "location": "View3D > Sidebar > Mindfire",
    "description": "Smart Retopology preventing N-gon creation via correct Order of Operations.",
    "category": "Mesh",
}

# =================================================================================================
# GLOBAL SETTINGS & UTILS
# =================================================================================================

class MindfireRetopoSettings(bpy.types.PropertyGroup):
    # --- CORE ---
    target_quality: bpy.props.EnumProperty(
        name="Quality Target",
        items=[
            ('DRAFT', "Draft / Proxy", "Low Poly (approx 5k)"),
            ('MID', "Game Ready", "Mid Poly (approx 15k-25k)"),
            ('HIGH', "Production / Hero", "High Poly (approx 50k+)"),
        ],
        default='MID'
    )

    use_smart_budget: bpy.props.BoolProperty(
        name="Smart Budget",
        description="Calculates face count based on Object Volume/Size",
        default=True
    )

    # --- FEATURE PRESERVATION ---
    detect_curvature: bpy.props.BoolProperty(
        name="Smart Feature Detection",
        description="Analyzes curvature to preserve non-hard edges",
        default=True
    )

    curvature_sensitivity: bpy.props.FloatProperty(
        name="Feature Sensitivity",
        default=0.5, min=0.1, max=1.0
    )

    # --- FLOW ---
    use_flow_polish: bpy.props.BoolProperty(
        name="Flow Polish (Relax)",
        description="Relaxes the grid after solving to remove 'zig-zags'",
        default=True
    )

# =================================================================================================
# OPERATOR LOGIC
# =================================================================================================

class MINDFIRE_OT_AutoRetopo(bpy.types.Operator):
    bl_idname = "mindfire.auto_retopo"
    bl_label = "Generate Workable Mesh"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        s = context.scene.mindfire_props
        obj = context.active_object

        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Please select a Mesh object.")
            return {'CANCELLED'}

        # ---------------------------------------------------------------------
        # STEP 1: SAFEGUARD THE ORIGINAL
        # ---------------------------------------------------------------------
        # We need an unmodified reference for the Shrinkwrap/Projection later.
        original_ref = self.duplicate_as_hidden_reference(obj)

        # Ensure we are in Object Mode
        if bpy.ops.object.mode_set.poll():
            bpy.ops.object.mode_set(mode='OBJECT')

        try:
            # ---------------------------------------------------------------------
            # STEP 2: CALCULATE SMART BUDGET (The Correction)
            # ---------------------------------------------------------------------
            # Instead of decimating later, we calculate the EXACT target now.
            target_faces = self.calculate_smart_budget(obj, s)
            self.report({'INFO'}, f"Calculated Smart Target: {target_faces} faces")

            # ---------------------------------------------------------------------
            # STEP 3: PRE-PROCESS (Normalization)
            # ---------------------------------------------------------------------
            # AI meshes often have non-manifold geometry. We fix this first.
            # Voxel Remesh is the best way to get a watertight "clay" model.

            # Calculate voxel size based on bounding box to avoid crashing
            bbox_diag = obj.dimensions.length
            # A good rule of thumb: Object Size / 150 gives decent density for the intermediate mesh
            voxel_size = bbox_diag / 150.0

            mod_remesh = obj.modifiers.new(name="Pre_Voxel", type='REMESH')
            mod_remesh.mode = 'VOXEL'
            mod_remesh.voxel_size = voxel_size
            mod_remesh.adaptivity = 0.0 # Strict uniform voxels
            bpy.ops.object.modifier_apply(modifier=mod_remesh.name)

            # ---------------------------------------------------------------------
            # STEP 4: SMART FEATURE EXTRACTION
            # ---------------------------------------------------------------------
            # This helps the Quad solver know where the "Hard Lines" are.
            if s.detect_curvature:
                self.extract_geometric_features(obj, sensitivity=s.curvature_sensitivity)

            # ---------------------------------------------------------------------
            # STEP 5: THE SOLVER (Quadriflow)
            # ---------------------------------------------------------------------
            # CRITICAL FIX: We solve directly for the target. No Decimation after this.

            bpy.ops.object.quadriflow_remesh(
                use_preserve_sharp=True,      # Uses the features we marked in Step 4
                use_preserve_boundary=True,
                use_mesh_symmetry=False,      # Can be exposed if needed, safe default off
                target_faces=target_faces,
                smooth_normals=False,         # We handle smoothing ourselves
                mode='FACES',
                seed=context.scene.frame_current # Random seed based on frame for variety if needed
            )

            # ---------------------------------------------------------------------
            # STEP 6: VOLUME RECOVERY & POLISH
            # ---------------------------------------------------------------------
            # The Quad mesh is now clean but might have lost volume (shrunken).
            # We use a Multi-Pass Projection to fix this.

            if s.use_flow_polish:
                self.apply_flow_polish(obj, original_ref)

            # ---------------------------------------------------------------------
            # STEP 7: CLEANUP
            # ---------------------------------------------------------------------
            # Set Shading
            for poly in obj.data.polygons:
                poly.use_smooth = True

            obj.data.use_auto_smooth = True
            obj.data.auto_smooth_angle = math.radians(30)

        except Exception as e:
            self.report({'ERROR'}, f"Retopo Failed: {str(e)}")
            # Reference cleanup happens in finally block
            return {'CANCELLED'}

        finally:
            # Always clean up the reference object
            if original_ref:
                try:
                    bpy.data.objects.remove(original_ref, do_unlink=True)
                except:
                    pass

        self.report({'INFO'}, "Mindfire Retopo Complete: Clean Quads Generated.")
        return {'FINISHED'}


    # ========================== HELPERS ==========================

    def duplicate_as_hidden_reference(self, obj):
        ref = obj.copy()
        ref.data = obj.data.copy()
        ref.name = obj.name + "_Source_Ref"
        bpy.context.collection.objects.link(ref)
        ref.hide_set(True)
        ref.hide_render = True
        ref.hide_viewport = True
        return ref

    def calculate_smart_budget(self, obj, settings):
        """
        Calculates face count based on Bounding Box Volume.
        AI Car models are usually large.
        """
        if not settings.use_smart_budget:
            # Hardcoded fallbacks
            if settings.target_quality == 'DRAFT': return 5000
            if settings.target_quality == 'MID': return 15000
            return 50000

        # Smart Calculation
        # Get diagonal length (approximate scale)
        diag = obj.dimensions.length

        # Base multipliers per meter (approx)
        # Assuming a car is roughly 4-5 units (meters) long
        # This formula adapts density to size.
        base_density = 3000 # faces per unit size

        if settings.target_quality == 'DRAFT': base_density = 1000
        if settings.target_quality == 'HIGH': base_density = 8000

        count = int(diag * base_density)

        # Clamp values to sane limits to prevent freezing
        return max(2000, min(count, 100000))

    def extract_geometric_features(self, obj, sensitivity):
        """
        Marks Sharp Edges based on angle, but respects curvature.
        """
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='DESELECT')

        # Select Sharp Edges
        # Lower angle = More sensitive (more edges marked)
        # Sensitivity 1.0 = Very sensitive (15 deg), 0.1 = Only 90 deg turns
        angle = 90 - (sensitivity * 75) # Maps 0.0-1.0 to 90-15 degrees

        bpy.ops.mesh.edges_select_sharp(sharpness=math.radians(angle))
        bpy.ops.mesh.mark_sharp()

        bpy.ops.object.mode_set(mode='OBJECT')

    def apply_flow_polish(self, obj, ref_obj):
        """
        The Secret Sauce: Smooths the wireframe WITHOUT shrinking the volume.
        """
        # Pass 1: Relax the vertices (Gets rid of zig-zags)
        # We use Laplacian Smooth modifier which is stable for static meshes
        mod_smooth = obj.modifiers.new("Relax_Flow", 'LAPLACIANSMOOTH')
        mod_smooth.iterations = 10
        mod_smooth.lambda_factor = 0.1 # Gentle factor to preserve shape
        bpy.ops.object.modifier_apply(modifier=mod_smooth.name)

        # Pass 2: Project back to surface (Regains Volume)
        mod_shrink = obj.modifiers.new("Volume_Snap", 'SHRINKWRAP')
        mod_shrink.target = ref_obj
        mod_shrink.wrap_method = 'PROJECT'
        mod_shrink.use_negative_direction = True
        mod_shrink.use_positive_direction = True
        mod_shrink.offset = 0.0
        bpy.ops.object.modifier_apply(modifier=mod_shrink.name)

        # Pass 3: Final gentle snap (Clean surface)
        mod_final = obj.modifiers.new("Surface_Link", 'SHRINKWRAP')
        mod_final.target = ref_obj
        mod_final.wrap_method = 'NEAREST_SURFACEPOINT'
        bpy.ops.object.modifier_apply(modifier=mod_final.name)


# =================================================================================================
# UI PANEL
# =================================================================================================

class MINDFIRE_PT_Panel(bpy.types.Panel):
    bl_label = "Mindfire Solution"
    bl_idname = "VIEW3D_PT_mindfire_retopo"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Mindfire"

    def draw(self, context):
        layout = self.layout
        s = context.scene.mindfire_props

        box = layout.box()
        box.label(text="Smart Settings", icon='MODIFIER')
        box.prop(s, "target_quality")
        box.prop(s, "use_smart_budget")

        box = layout.box()
        box.label(text="Feature Detection", icon='EYEDROPPER')
        box.prop(s, "detect_curvature")
        if s.detect_curvature:
            box.prop(s, "curvature_sensitivity", slider=True)

        box = layout.box()
        box.prop(s, "use_flow_polish")

        layout.separator()
        layout.operator("mindfire.auto_retopo", text="Execute Hybrid Retopo", icon='SHADING_WIRE')

# =================================================================================================
# REGISTRATION
# =================================================================================================

classes = (MindfireRetopoSettings, MINDFIRE_OT_AutoRetopo, MINDFIRE_PT_Panel)

def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    bpy.types.Scene.mindfire_props = bpy.props.PointerProperty(type=MindfireRetopoSettings)

def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
    del bpy.types.Scene.mindfire_props

if __name__ == "__main__":
    register()
