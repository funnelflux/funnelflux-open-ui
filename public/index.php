<?php
// Fallback for nginx directory index — serves the SPA entry point
readfile(__DIR__ . '/index.html');
