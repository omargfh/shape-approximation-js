import { useEffect, useRef, useState } from "react";

type CanvasProps = {
    settings: Record<string, any>;
};

const Canvas = ({ settings }: CanvasProps) => {

    const canvas = useRef<HTMLCanvasElement>(null);
    let ctx: CanvasRenderingContext2D | null = null; // This will be initialized when DOM loads

    // Avoiding state access in event listener
    const [_isDrawing, _setIsDrawing] = useState(false);
    const isDrawing = useRef(_isDrawing);
    const setIsDrawing = (value: boolean) => {
        isDrawing.current = value;
        _setIsDrawing(value);
    };

    const [shapeLabel, setShapeLabel] = useState<string>("");

    function resizeCanvas() {
        if (canvas.current) {
            canvas.current.width = window.innerWidth > settings.maxWidth ? settings.maxWidth : window.innerWidth;
            canvas.current.height = window.innerHeight > settings.maxHeight ? settings.maxHeight : window.innerHeight;
        }
    }

    function getMouseCoordinates(event: MouseEvent) {
        const rect = canvas.current?.getBoundingClientRect();
        return {
            x: event.clientX - rect!.left,
            y: event.clientY - rect!.top
        };
    }

    function mouseDownHandler(e: MouseEvent) {
        // Clear canvas
        ctx?.clearRect(0, 0, canvas.current!.width, canvas.current!.height);

        // Handle null | undefined ctx
        if (!ctx) return;

        // Begin drawing
        setIsDrawing(true);

        // Get mouse coordinates
        const {x, y} = getMouseCoordinates(e);

        // Begin path
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function mouseMoveHandler(e: MouseEvent) {
        // Handle null | undefined ctx
        if (!ctx) return;
        if (!isDrawing.current) return;

        // Get mouse coordinates
        const {x, y} = getMouseCoordinates(e);

        // use lineTo() to draw a line from the current position to the new position
        ctx.lineTo(x, y);
        ctx.stroke();
    }

    function mouseUpHandler(e: MouseEvent) {
        if (!ctx) return;

        const image = dumpCanvas(ctx);
        const shapes = getShapes(image);
        const errors: Record<string, number> = getErrors(image, shapes);

        const min = {name: '', value: Number.MAX_VALUE};
        Object.keys(errors).forEach((key) => {
            if (errors[key] < min.value) {
                min.name = key;
                min.value = errors[key];
            }
        });
        setShapeLabel(min.name.split('Error')[0].toLowerCase());

        // Stop drawing
        setIsDrawing(false);
    }

    function commandZHandler(e: KeyboardEvent) {
        if (!ctx) return;
        if (e.key !== 'z') return;
        if (['MacIntel', 'MacPPC', 'Mac68K'].includes(navigator.platform)) {
            if (!e.metaKey) return;
        } else {
            if (!e.ctrlKey) return;
        }

        // Clear canvas
        ctx.clearRect(0, 0, canvas.current!.width, canvas.current!.height);
    }

    function dumpCanvas(ctx: CanvasRenderingContext2D | null): number[][] {
        if (!ctx) return [];

        const image = ctx.getImageData(0, 0, canvas.current!.width, canvas.current!.height);
        const data = image.data;

        const imageWidth = image.width;
        const pixels = [];
        for (let i = 0; i < data.length; i += 4) {
            const pixel = data[i] + data[i + 1] + data[i + 2] + data[i + 3] > 0 ? 1 : 0;
            pixels.push(pixel);
        }

        const rows = [];
        for (let i = 0; i < pixels.length; i += imageWidth) {
            const row = pixels.slice(i, i + imageWidth);
            rows.push(row);
        }

        return rows;
    }

    interface coordinate {
        x: number;
        y: number;
    }
    function pixelBounds(image: number[][]): Record<string, any>{
        if (!ctx) return {};
        let {x_min, y_min, x_max, y_max} = {x_min: 0, y_min: 0, x_max: 0, y_max: 0};
        let coords: Record<string, coordinate> = {point_1: {x: 0, y: 0}, point_2: {x: 0, y: 0}, point_3: {x: 0, y: 0}, point_4: {x: 0, y: 0}};

        image.forEach((row, row_index) => {
            row.forEach((pixel, pixel_index) => {
                if (pixel === 1) {
                    if (x_min === 0 || pixel_index < x_min) {
                        x_min = pixel_index;
                        coords.point_1 = {x: pixel_index, y: row_index};
                    }
                    if (y_min === 0 || row_index < y_min) {
                        y_min = row_index;
                        coords.point_2 = {x: pixel_index, y: row_index};
                    }
                    if (pixel_index > x_max) {
                        x_max = pixel_index;
                        coords.point_3 = {x: pixel_index, y: row_index};
                    }
                    if (row_index > y_max) {
                        y_max = row_index;
                        coords.point_4 = {x: pixel_index, y: row_index};
                    }
                }
            });
        });

        Object.keys(coords).forEach((e, i) => {
            ctx?.fillRect(coords[e].x, coords[e].y, 5, 5);
        })
        return {
            coords,
            boundaries: {x_min, y_min, width: x_max-x_min, height: y_max-y_min}
        }
    }

    function getShapes(image: number[][]): Record<string, number[][]> {

        if (!ctx) return {};
        const retrievedPixelBounds = pixelBounds(image);
        const coords = retrievedPixelBounds.coords;
        const boundaries = retrievedPixelBounds.boundaries;


        // Create virtual canvas
        const {height, width} = canvas.current!;
        const virtualCanvas = document.createElement('canvas');
        virtualCanvas.width = width;
        virtualCanvas.height = height;
        const virtualCtx = virtualCanvas.getContext('2d');
        if (!virtualCtx) return {};
        virtualCtx.lineWidth = 25;

        const displayAllowed = false;
        function displayIn(id: string) {
            if (!displayAllowed) return;
            let tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = width;
            tmpCanvas.height = height;
            if (!virtualCtx) return;
            tmpCanvas.getContext('2d')?.putImageData(virtualCtx.getImageData(0, 0, width, height), 0, 0);
            const tmpDiv = document.getElementById(id);
            if (tmpDiv) {
                tmpDiv.innerHTML = '';
                tmpDiv.appendChild(tmpCanvas);
            }
        }

        // Draw square to virtual canvas and store it
        virtualCtx?.beginPath();
        virtualCtx?.moveTo(coords.point_1.x, coords.point_2.y);
        virtualCtx?.lineTo(coords.point_1.x, coords.point_4.y);
        virtualCtx?.lineTo(coords.point_3.x, coords.point_4.y);
        virtualCtx?.lineTo(coords.point_3.x, coords.point_2.y);
        virtualCtx?.lineTo(coords.point_1.x, coords.point_2.y);
        virtualCtx.stroke();
        const square = dumpCanvas(virtualCtx);

        displayIn('square');

        // Draw ellipse to virtual canvas and store it
        virtualCtx.clearRect(0, 0, width, height);
        virtualCtx.beginPath();
        virtualCtx.ellipse((coords.point_1.x + coords.point_3.x) / 2, (coords.point_2.y + coords.point_4.y) / 2, (coords.point_3.x - coords.point_1.x) / 2, (coords.point_4.y - coords.point_2.y) / 2, 0, 0, 2 * Math.PI);
        virtualCtx.stroke();
        const ellipse = dumpCanvas(virtualCtx);

        displayIn('ellipse');

        // Draw line to virtual canvas and store it
        virtualCtx.clearRect(0, 0, width, height);
        virtualCtx.beginPath();
        virtualCtx.moveTo(coords.point_1.x, coords.point_1.y);
        virtualCtx.lineTo(coords.point_3.x, coords.point_3.y);
        virtualCtx.stroke();
        const line = dumpCanvas(virtualCtx);

        displayIn('line');

        if (boundaries.width < 10 || boundaries.height < 10) {
            return {
                square: new Array(height).fill(new Array(width).fill(0)),
                ellipse: new Array(height).fill(new Array(width).fill(0)),
                line
            }
        }
        return {square, ellipse, line};
    }

    function getErrors(image: number[][], shapes: Record<string, number[][]>) {
        const {square, ellipse, line} = shapes;

        // Determine error
        let squareError = 0;
        let ellipseError = 0;
        let lineError = 0;

        // Compare pixel bounds
        image.forEach((row, row_index) => {
            row.forEach((pixel, pixel_index) => {
                if (pixel === 1) {
                    if (line[row_index][pixel_index] === 1) {
                        squareError++;
                        ellipseError++;
                    }
                    if (ellipse[row_index][pixel_index] === 1) {
                        squareError++;
                        lineError++;
                    }
                    if (square[row_index][pixel_index] === 1) {
                        ellipseError++;
                        lineError++;
                    }

                }
            });
        });
        return {squareError, ellipseError, lineError};
    }

    // Canvas event listeners
    useEffect(() => {
        if (canvas.current) {
            ctx = canvas.current.getContext('2d', {willReadFrequently: true});
        }
        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('mousedown', mouseDownHandler);
        window.addEventListener('mousemove', mouseMoveHandler);
        window.addEventListener('mouseup', mouseUpHandler);
        window.addEventListener('keydown', commandZHandler);
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mouseup', mouseUpHandler);
            window.removeEventListener('mousemove', mouseMoveHandler);
            window.removeEventListener('mousedown', mouseDownHandler);
            window.removeEventListener('keydown', commandZHandler);
        }
    }, []);

    return (
        <div className='canvas'>
            <canvas ref={canvas} id='canvas' width={settings.maxWidth} height={settings.maxHeight} />
            {shapeLabel.length > 0 && <span>This is a {shapeLabel}</span>}
        </div>
    )
}

export default Canvas