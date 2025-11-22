# Procedural Container Barrier

This component generates a circular, procedurally arranged environment using shipping containers. It serves as both the visual scenery and the physical boundary for the playable area in the scene.

It is built using **React Three Fiber** and utilizes `InstancedMesh` to render hundreds of objects efficiently.

## Overview

The component generates a container yard based on polar coordinates. It places containers in concentric rings, starting from the outer edge of the surface (50m radius) and moving inward.

The layout logic distinguishes between the **Barrier** (the outermost ring) and the **Obstacles** (the inner rings).

## Technical Implementation

### Performance & Instancing
To maintain high FPS, this component does not render individual `Mesh` components for every container. Instead, it calculates the `Matrix4` (position, rotation, scale) for every single container during the initial render pass.

It groups these matrices by container type (Green, Red, Blue, etc.) and feeds the data into five `instancedMesh` objects. This reduces the scene overhead to just **5 draw calls** for the entire environment, regardless of how many containers are generated.

### Generation Logic

The placement algorithm works as follows:

1.  **Ring Generation:** The code loops through a defined number of depth levels (default is 3 rings).
2.  **Outer Ring (The Barrier):**
    * **Height:** Fixed at 5 levels high to ensure the player cannot jump over the edge.
    * **Layout:** Uses a tight gap and a specific "zig-zag" depth offset. This prevents the wall from looking like a perfectly smooth, artificial curve and resolves geometry clipping at the corners.
3.  **Inner Rings (The Obstacles):**
    * **Height:** The max height scales down as it gets closer to the center (3 levels, then 2 levels).
    * **Rotation:** Applies random Y-axis rotation to simulate a disorganized yard, rather than a perfect grid.
    * **Spacing:** Uses wider gaps to create driving lanes.

### Visual

* **Weighted Randomness:** The "Gray" container variant is added to the selection pool twice, making it appear more frequently than bright colors for a more grounded look, because I like it the most.

### Safe Zone Calculation

A distance check (`MIN_INNER_RADIUS`) is applied during generation. It calculates the container's final position plus its half-depth. If any part of the container would intrude into the central 30-meter circle, that specific instance is skipped. This guarantees the car spawn area is never blocked.

## Configuration

The behavior is controlled by constants at the top of the file:

* `SURFACE_RADIUS`: The total radius of the arena.
* `RING_HEIGHTS`: An array defining the max stack height for each ring index `[5, 3, 2]`.
* `MIN_INNER_RADIUS`: The clear zone in the center (meters).
* `BARRIER_ZIGZAG`: The depth offset for the outer wall construction to create the sawtooth effect.

## Assets

The component requires a GLTF file located at `/containers.glb` with the following named nodes:

* `container-green`
* `container-white`
* `container-red`
* `container-blue`
* `container-gray`